const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const notificationService = require('../services/notificationService');
const emailAlertService = require('../services/emailAlertService');

const config = require('../config/config');
const JWT_SECRET = config.jwt.secret;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

router.use(verifyToken);

// Get all debts for a user
router.get('/', async (req, res) => {
  try {
    // Use user from token or fallback to user 2 for testing
    const userId = req.user?.id || 2;
    
    // Simple query first to test
    const connection = await db;
    const [debts] = await connection.execute(
      'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    
    // Get total count
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM debts WHERE user_id = ?',
      [userId]
    );
    const total = countResult[0].total;
    
    res.json({
      debts,
      pagination: {
        page: 1,
        limit: 20,
        total,
        pages: Math.ceil(total / 20)
      }
    });
    
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
});

// Get a single debt by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await db;
    const [debts] = await connection.execute(
      `SELECT 
        d.*,
        CASE 
          WHEN d.status = 'paid' THEN 'Paid'
          WHEN d.due_date < CURDATE() AND d.status != 'paid' THEN 'Overdue'
          WHEN d.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND d.status != 'paid' THEN 'Due Soon'
          ELSE 'Active'
        END as status_display,
        DATEDIFF(d.due_date, CURDATE()) as days_until_due
       FROM debts d 
       WHERE d.id = ? AND d.user_id = ?`,
      [id, req.user.id]
    );
    
    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    // Get payment history for this debt
    const [payments] = await connection.execute(
      `SELECT * FROM transactions 
       WHERE debt_id = ? AND type = 'payment_received' 
       ORDER BY created_at DESC`,
      [id]
    );
    
    res.json({
      debt: debts[0],
      payments
    });
    
  } catch (error) {
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: 'Failed to fetch debt' });
  }
});

// Create a new debt
router.post('/', async (req, res) => {
  try {
    const {
      debtor_name,
      debtor_email,
      debtor_phone,
      amount,
      description,
      category,
      due_date,
      reference_number,
      interest_rate = 0,
      payment_terms,
      notes
    } = req.body;
    
    // Strengthened validation and normalization
    const amountNum = Number(amount);
    const interestNum = Number(interest_rate ?? 0);
    const dueDateStr = typeof due_date === 'string' ? due_date.trim() : '';
    const dateFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr);
    const dueDateValid = dateFormatValid && !Number.isNaN(new Date(dueDateStr + 'T00:00:00').getTime());

    if (!debtor_name || !dueDateStr || !dateFormatValid) {
      return res.status(400).json({ error: 'Debtor name and a valid due date (YYYY-MM-DD) are required' });
    }

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!Number.isFinite(interestNum) || interestNum < 0) {
      return res.status(400).json({ error: 'Interest rate must be a non-negative number' });
    }

    const connection = await db;
    const result = await connection.execute(
      `INSERT INTO debts (
        user_id, debtor_name, debtor_email, debtor_phone, amount, 
        description, category, due_date, reference_number, 
        interest_rate, payment_terms, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [
        req.user.id, 
        debtor_name, 
        debtor_email || null, 
        debtor_phone || null, 
        amountNum,
        description || null, 
        category || null, 
        dueDateStr, 
        reference_number || null,
        interestNum, 
        payment_terms || null, 
        notes || null
      ]
    );
    
    const debtId = result[0].insertId;
    
    // Create notification for debt creation (non-blocking)
    try {
      await notificationService.createNotification(
        req.user.id,
        'system',
        'New Debt Created',
        `Debt of Ksh ${amountNum.toLocaleString()} has been created for ${debtor_name}`,
        debtId,
        'debt'
      );
    } catch (notifyErr) {
      console.error('Non-blocking: Failed to create debt creation notification:', notifyErr?.message || notifyErr);
    }

    // Send email alert for debt creation (non-blocking)
    try {
      await emailAlertService.sendTransactionAlert(req.user.id, {
        type: 'debt_created',
        amount: amountNum,
        debtorName: debtor_name,
        description: description || `New debt created for ${debtor_name}`
      });
    } catch (emailErr) {
      console.error('Non-blocking: Failed to send debt creation email alert:', emailErr?.message || emailErr);
    }
    
    // Schedule payment due notification if due date is in the future (non-blocking)
    const dueDateObj = new Date(dueDateStr + 'T00:00:00');
    const today = new Date();
    if (dueDateValid && dueDateObj > today) {
      const notificationDate = new Date(dueDateObj.getTime() - 24 * 60 * 60 * 1000);
      if (notificationDate > today) {
        try {
          await notificationService.createNotification(
            req.user.id,
            'payment_due',
            'Payment Due Soon',
            `Payment of Ksh ${amountNum.toLocaleString()} from ${debtor_name} is due on ${dueDateStr}`,
            debtId,
            'debt'
          );
        } catch (schedErr) {
          console.error('Non-blocking: Failed to create scheduled payment due notification:', schedErr?.message || schedErr);
        }
      }
    }
    
    res.status(201).json({
      message: 'Debt created successfully',
      debtId: debtId
    });
    
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Failed to create debt' });
  }
});

// Update a debt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      debtor_name,
      debtor_email,
      debtor_phone,
      amount,
      description,
      category,
      due_date,
      reference_number,
      interest_rate,
      payment_terms,
      notes,
      status
    } = req.body;
    
    console.log('Debt update request:', { id, userId: req.user.id, body: req.body });
    
    // Check if debt exists and belongs to user
    const connection = await db;
    const [existingDebts] = await connection.execute(
      'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (existingDebts.length === 0) {
      console.log('Debt not found for user:', { id, userId: req.user.id });
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    // Validation
    if (amount && (isNaN(amount) || parseFloat(amount) <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    if (interest_rate && (isNaN(interest_rate) || parseFloat(interest_rate) < 0)) {
      return res.status(400).json({ error: 'Interest rate must be a non-negative number' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (debtor_name !== undefined) {
      updateFields.push('debtor_name = ?');
      updateValues.push(debtor_name);
    }
    if (debtor_email !== undefined) {
      updateFields.push('debtor_email = ?');
      updateValues.push(debtor_email);
    }
    if (debtor_phone !== undefined) {
      updateFields.push('debtor_phone = ?');
      updateValues.push(debtor_phone);
    }
    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(parseFloat(amount));
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (due_date !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(due_date);
    }
    if (reference_number !== undefined) {
      updateFields.push('reference_number = ?');
      updateValues.push(reference_number);
    }
    if (interest_rate !== undefined) {
      updateFields.push('interest_rate = ?');
      updateValues.push(parseFloat(interest_rate));
    }
    if (payment_terms !== undefined) {
      updateFields.push('payment_terms = ?');
      updateValues.push(payment_terms);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push('updated_at = NOW()');
    
    console.log('Update query:', `UPDATE debts SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`);
    console.log('Update values:', [...updateValues, id, req.user.id]);
    
    await connection.execute(
      `UPDATE debts SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      [...updateValues, id, req.user.id]
    );
    
    console.log('Debt updated successfully');
    res.json({ message: 'Debt updated successfully' });
    
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Failed to update debt' });
  }
});

// Delete a debt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if debt exists and belongs to user
    const connection = await db;
    const [existingDebts] = await connection.execute(
      'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (existingDebts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    // Delete related transactions first (due to foreign key constraints)
    await connection.execute('DELETE FROM transactions WHERE debt_id = ?', [id]);
    
    // Delete the debt
    await connection.execute('DELETE FROM debts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    res.json({ message: 'Debt deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
});

// Get debt categories
router.get('/categories/list', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;
    const [categories] = await connection.execute(
      `SELECT DISTINCT category, COUNT(*) as count 
       FROM debts 
       WHERE user_id = ? AND category IS NOT NULL AND category != ''
       GROUP BY category 
       ORDER BY count DESC, category ASC`,
      [userId]
    );
    
    res.json(categories);
    
  } catch (error) {
    console.error('Error fetching debt categories:', error);
    res.status(500).json({ error: 'Failed to fetch debt categories' });
  }
});

// Create new category (by updating existing debts or creating a template)
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // For now, we'll just return success since categories are stored as strings in the debts table
    // In a more complex system, you might have a separate categories table
    res.json({ 
      message: 'Category created successfully',
      category: { name: name.trim(), description: description?.trim() || '' }
    });
    
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category name (rename all debts with old category to new category)
router.put('/categories/:oldName', async (req, res) => {
  try {
    const { oldName } = req.params;
    const { newName } = req.body;
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: 'New category name is required' });
    }
    
    const connection = await db;
    const [result] = await connection.execute(
      'UPDATE debts SET category = ? WHERE user_id = ? AND category = ?',
      [newName.trim(), req.user.id, oldName]
    );
    
    res.json({ 
      message: 'Category updated successfully',
      affectedRows: result.affectedRows
    });
    
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (set all debts with this category to null)
router.delete('/categories/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    const connection = await db;
    const [result] = await connection.execute(
      'UPDATE debts SET category = NULL WHERE user_id = ? AND category = ?',
      [req.user.id, categoryName]
    );
    
    res.json({ 
      message: 'Category deleted successfully',
      affectedRows: result.affectedRows
    });
    
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get debt statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const connection = await db;
    const [stats] = await connection.execute(
      `SELECT 
        COUNT(*) as total_debts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_debts,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_debts,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_debts,
        SUM(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN 1 ELSE 0 END) as overdue_debts,
        SUM(CASE WHEN due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status != 'paid' THEN 1 ELSE 0 END) as due_soon_debts,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) as active_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN amount ELSE 0 END), 0) as overdue_amount
       FROM debts 
       WHERE user_id = ?`,
      [req.user.id]
    );
    
    res.json(stats[0]);
    
  } catch (error) {
    console.error('Error fetching debt statistics:', error);
    res.status(500).json({ error: 'Failed to fetch debt statistics' });
  }
});

// Get payment schedule for debts
router.get('/schedule/upcoming', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const { days = 30 } = req.query;
    
    const connection = await db;
    const [schedule] = await connection.execute(
      `SELECT 
        d.*,
        DATEDIFF(d.due_date, CURDATE()) as days_until_due,
        CASE 
          WHEN d.due_date < CURDATE() AND d.status != 'paid' THEN 'Overdue'
          WHEN d.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND d.status != 'paid' THEN 'Due Soon'
          ELSE 'Scheduled'
        END as schedule_status
       FROM debts d 
       WHERE d.user_id = ? 
         AND d.status != 'paid' 
         AND d.status != 'cancelled'
         AND d.due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY d.due_date ASC`,
      [userId, parseInt(days)]
    );
    
    res.json(schedule);
    
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    res.status(500).json({ error: 'Failed to fetch payment schedule' });
  }
});

// Get overdue debts with outstanding amounts (per debt)
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;

    const [rows] = await connection.execute(
      `SELECT 
         d.id AS debt_id,
         d.debtor_name,
         d.amount AS debt_amount,
         COALESCE(p.paid_amount, 0) AS paid_amount,
         GREATEST(d.amount - COALESCE(p.paid_amount, 0), 0) AS outstanding_amount,
         d.due_date,
         DATEDIFF(CURDATE(), d.due_date) AS days_overdue,
         d.status,
         d.category,
         d.reference_number
       FROM debts d
       LEFT JOIN (
         SELECT debt_id, SUM(amount) AS paid_amount
         FROM transactions
         WHERE type = 'payment_received'
         GROUP BY debt_id
       ) p ON p.debt_id = d.id
       WHERE d.user_id = ?
         AND IFNULL(d.status,'active') <> 'paid'
         AND GREATEST(d.amount - COALESCE(p.paid_amount, 0), 0) > 0
         AND d.due_date < CURDATE()
       ORDER BY days_overdue DESC, outstanding_amount DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching overdue debts:', error);
    res.status(500).json({ error: 'Failed to fetch overdue debts' });
  }
});

// Get overdue summary per debtor
router.get('/overdue/summary', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;

    const [rows] = await connection.execute(
      `WITH payments AS (
         SELECT debt_id, SUM(amount) AS paid_amount
         FROM transactions
         WHERE type = 'payment_received'
         GROUP BY debt_id
       )
       SELECT 
         d.debtor_name,
         COUNT(*) AS overdue_debts,
         SUM(GREATEST(d.amount - COALESCE(p.paid_amount,0), 0)) AS total_outstanding,
         MAX(DATEDIFF(CURDATE(), d.due_date)) AS max_days_overdue
       FROM debts d
       LEFT JOIN payments p ON p.debt_id = d.id
       WHERE d.user_id = ?
         AND IFNULL(d.status,'active') <> 'paid'
         AND GREATEST(d.amount - COALESCE(p.paid_amount,0), 0) > 0
         AND d.due_date < CURDATE()
       GROUP BY d.debtor_name
       ORDER BY total_outstanding DESC, max_days_overdue DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching overdue summary:', error);
    res.status(500).json({ error: 'Failed to fetch overdue summary' });
  }
});

// Record a payment for a debt
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, notes } = req.body;
    
    // Validation
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    
    // Check if debt exists and belongs to user
    const connection = await db;
    const [debts] = await connection.execute(
      'SELECT * FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const debt = debts[0];
    
    // Record the payment transaction
    const paymentResult = await connection.execute(
      `INSERT INTO transactions (
        user_id, debt_id, type, amount, description, 
        payment_method, payment_date, transaction_date, notes, created_at
      ) VALUES (?, ?, 'payment_received', ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id, id, parseFloat(amount), 
        `Payment received for debt: ${debt.debtor_name}`,
        payment_method, payment_date || new Date().toISOString().split('T')[0], 
        payment_date || new Date().toISOString().split('T')[0], notes
      ]
    );
    
    // Check if debt is fully paid
    const [totalPayments] = await connection.execute(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM transactions WHERE debt_id = ? AND type = "payment_received"',
      [id]
    );
    
    const totalPaid = totalPayments[0].total_paid;
    const debtAmount = parseFloat(debt.amount);
    
    // Update debt status if fully paid
    if (totalPaid >= debtAmount) {
      await connection.execute(
        'UPDATE debts SET status = "paid", updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      // Create notification for fully paid debt
      await notificationService.createNotification(
        req.user.id,
        'system',
        'Debt Fully Paid',
        `Debt from ${debt.debtor_name} has been fully settled with payment of Ksh ${parseFloat(amount).toLocaleString()}`,
        id,
        'debt'
      );
    } else {
      // Create notification for partial payment
      const remainingAmount = debtAmount - totalPaid;
      await notificationService.createNotification(
        req.user.id,
        'system',
        'Partial Payment Received',
        `Partial payment of Ksh ${parseFloat(amount).toLocaleString()} received from ${debt.debtor_name}. Remaining: Ksh ${remainingAmount.toLocaleString()}`,
        id,
        'debt'
      );
    }
    
    // Create general payment received notification
    await notificationService.createNotification(
      req.user.id,
      'system',
      'Payment Received',
      `Payment of Ksh ${parseFloat(amount).toLocaleString()} received from ${debt.debtor_name}`,
      paymentResult[0].insertId,
      'transaction'
    );
    
    res.status(201).json({
      message: 'Payment recorded successfully',
      transactionId: paymentResult[0].insertId,
      totalPaid,
      remainingAmount: Math.max(0, debtAmount - totalPaid),
      isFullyPaid: totalPaid >= debtAmount
    });
    
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payment history for a debt
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if debt exists and belongs to user
    const connection = await db;
    const [debts] = await connection.execute(
      'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const [payments] = await connection.execute(
      `SELECT * FROM transactions 
       WHERE debt_id = ? AND type = 'payment_received' 
       ORDER BY payment_date DESC, created_at DESC`,
      [id]
    );
    
    res.json(payments);
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});


// Get payment schedule
router.get('/payment-schedule', async (req, res) => {
  try {
    const connection = await db;
    const { status, days = 30 } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.debtor_name,
        d.amount,
        d.description,
        d.due_date,
        d.status,
        d.category,
        d.reference_number,
        'debt' as type
      FROM debts d
      WHERE d.user_id = ? AND d.status != 'paid'
    `;
    
    let params = [req.user.id];
    
    if (status === 'overdue') {
      query += ' AND d.due_date < CURDATE()';
    } else if (status === 'due_today') {
      query += ' AND DATE(d.due_date) = CURDATE()';
    } else if (status === 'upcoming') {
      query += ' AND d.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)';
      params.push(parseInt(days));
    }
    
    query += ' ORDER BY d.due_date ASC';
    
    const [results] = await connection.execute(query, params);
    res.json(results);
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    res.status(500).json({ error: 'Failed to fetch payment schedule' });
  }
});

module.exports = router;