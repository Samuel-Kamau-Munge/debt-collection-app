const express = require('express');
const db = require('../db');
const router = express.Router();
const notificationService = require('../services/notificationService');
const emailAlertService = require('../services/emailAlertService');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'your_secret_key';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Create a new transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { debt_id, amount, payment_method, notes, payment_date } = req.body;

    // Validation
    if (!debt_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: debt_id, amount, payment_method' });
    }

    // Validate payment method
    if (!['kcb'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method. Only KCB is supported.' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const connection = await db;

    // Verify the debt exists and belongs to the user
    const [debtCheck] = await connection.execute(
      'SELECT id, amount, debtor_name FROM debts WHERE id = ? AND user_id = ?',
      [debt_id, userId]
    );

    if (debtCheck.length === 0) {
      return res.status(404).json({ error: 'Debt not found or access denied' });
    }

    const debt = debtCheck[0];

    // Insert transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions 
       (user_id, debt_id, type, amount, payment_method, description, transaction_date, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
      [
        userId,
        debt_id,
        'pay',  // Shorter value for type column
        amount,
        payment_method,
        notes || `Payment for debt: ${debt.debtor_name}`,
        payment_date || new Date().toISOString().split('T')[0],
      ]
    );

    const transactionId = result.insertId;

    // Get the created transaction
    const [newTransaction] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    // Create notification for payment received
    await notificationService.createNotification(
      userId,
      'system',
      'Payment Received',
      `Payment of Ksh ${parseFloat(amount).toLocaleString()} received from ${debt.debtor_name}`,
      transactionId,
      'transaction'
    );

    // Send email alert for payment received
    await emailAlertService.sendTransactionAlert(userId, {
      type: 'payment_received',
      amount: parseFloat(amount),
      debtorName: debt.debtor_name,
      description: notes || `Payment for debt: ${debt.debtor_name}`
    });
    
    // Check if this payment fully settles the debt
    const [debtDetails] = await connection.execute(
      'SELECT amount FROM debts WHERE id = ?',
      [debt_id]
    );
    
    if (debtDetails.length > 0) {
      const totalDebtAmount = parseFloat(debtDetails[0].amount);
      const paidAmount = parseFloat(amount);
      
      if (paidAmount >= totalDebtAmount) {
        // Debt is fully paid
        await notificationService.createNotification(
          userId,
          'system',
          'Debt Fully Paid',
          `Debt from ${debt.debtor_name} has been fully settled with payment of Ksh ${parseFloat(amount).toLocaleString()}`,
          debt_id,
          'debt'
        );
      } else {
        // Partial payment
        const remainingAmount = totalDebtAmount - paidAmount;
        await notificationService.createNotification(
          userId,
          'system',
          'Partial Payment Received',
          `Partial payment of Ksh ${parseFloat(amount).toLocaleString()} received from ${debt.debtor_name}. Remaining: Ksh ${remainingAmount.toLocaleString()}`,
          debt_id,
          'debt'
        );
      }
    }
    
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: newTransaction[0]
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get all transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status, startDate, endDate } = req.query;

    let query = `
      SELECT 
        t.*,
        d.amount as debt_amount,
        d.category as debt_category
      FROM transactions t
      LEFT JOIN debts d ON t.debt_id = d.id
      WHERE t.user_id = ?
    `;
    
    let params = [userId];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (startDate && endDate) {
      query += ' AND t.transaction_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    const connection = await db;
    const [results] = await connection.execute(query, params);
    res.json({ transactions: results });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get a specific transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const query = `
      SELECT 
        t.*,
        d.amount as debt_amount,
        d.category as debt_category,
        d.description as debt_description
      FROM transactions t
      LEFT JOIN debts d ON t.debt_id = d.id
      WHERE t.id = ? AND t.user_id = ?
    `;

    const connection = await db;
    const [results] = await connection.execute(query, [transactionId, userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: results[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Record a payment received
router.post('/receive-payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { payer_name, debt_id, amount, payment_method, description, transaction_date, reference_number } = req.body;

    // Validation
    if (!payer_name || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate payment method
    if (!['kcb'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method. Only KCB is supported.' });
    }

    // Insert transaction
    const insertQuery = `
      INSERT INTO transactions (user_id, payer_name, debt_id, type, amount, payment_method, description, transaction_date, reference_number)
      VALUES (?, ?, ?, 'payment_received', ?, ?, ?, ?, ?)
    `;

    const transactionDate = transaction_date || new Date().toISOString().split('T')[0];
    const connection = await db;
    const [result] = await connection.execute(insertQuery, [
      userId, 
      payer_name, 
      debt_id || null, 
      amount, 
      payment_method, 
      description || null, 
      transactionDate, 
      reference_number || null
    ]);

    // If this payment is for a specific debt, update debt status
    if (debt_id) {
      try {
        // Get current debt amount
        const debtQuery = 'SELECT amount FROM debts WHERE id = ? AND user_id = ?';
        const [debtResults] = await connection.execute(debtQuery, [debt_id, userId]);
        
        if (debtResults.length > 0) {
          const debtAmount = parseFloat(debtResults[0].amount);
          const paymentAmount = parseFloat(amount);
          
          // If payment amount equals or exceeds debt amount, mark as paid
          if (paymentAmount >= debtAmount) {
            const updateDebtQuery = 'UPDATE debts SET status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';
            await connection.execute(updateDebtQuery, [debt_id, userId]);
          }
        }
      } catch (debtError) {
        console.error('Failed to update debt status:', debtError);
        // Don't fail the transaction if debt update fails
      }
    }

    res.json({ 
      message: 'Payment recorded successfully', 
      transaction_id: result.insertId 
    });
  } catch (error) {
    console.error('Receive payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Record a payment made
router.post('/make-payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { credit_id, amount, payment_method, description, transaction_date, reference_number } = req.body;

    // Validation
    if (!credit_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate payment method
    if (!['kcb'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method. Only KCB is supported.' });
    }

    const connection = await db;

    // Check if credit belongs to user
    const creditCheckQuery = 'SELECT id FROM credits WHERE id = ? AND user_id = ?';
    const [creditResults] = await connection.execute(creditCheckQuery, [credit_id, userId]);

    if (creditResults.length === 0) {
      return res.status(400).json({ error: 'Invalid credit' });
    }

    // Insert transaction
    const insertQuery = `
      INSERT INTO transactions (user_id, credit_id, type, amount, payment_method, description, transaction_date, reference_number)
      VALUES (?, ?, 'payment_made', ?, ?, ?, ?, ?)
    `;

    const transactionDate = transaction_date || new Date().toISOString().split('T')[0];
    const [result] = await connection.execute(insertQuery, [
      userId, 
      credit_id, 
      amount, 
      payment_method, 
      description || null, 
      transactionDate, 
      reference_number || null
    ]);

    res.json({ 
      message: 'Payment recorded successfully', 
      transaction_id: result.insertId 
    });
  } catch (error) {
    console.error('Make payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Update a transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;
    const { amount, payment_method, description, transaction_date, status, reference_number } = req.body;

    const updateQuery = `
      UPDATE transactions 
      SET amount = ?, payment_method = ?, description = ?, transaction_date = ?, status = ?, reference_number = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    const connection = await db;
    const [result] = await connection.execute(updateQuery, [
      amount, 
      payment_method, 
      description || null, 
      transaction_date, 
      status, 
      reference_number || null, 
      transactionId, 
      userId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const deleteQuery = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';
    const connection = await db;
    const [result] = await connection.execute(deleteQuery, [transactionId, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});


// Get transaction history with filters
router.get('/history/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30', type } = req.query; // days

    let query = `
      SELECT 
        DATE(transaction_date) as date,
        type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions 
      WHERE user_id = ? AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    
    let params = [userId, period];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' GROUP BY DATE(transaction_date), type ORDER BY date DESC';

    const connection = await db;
    const [results] = await connection.execute(query, params);

    // Group by type for easier frontend consumption
    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.type]) {
        acc[row.type] = [];
      }
      acc[row.type].push(row);
      return acc;
    }, {});

    res.json({ history: groupedResults });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get pending transactions
router.get('/pending/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await db;
    
    // Get pending payments (debts that are not paid)
    const [pendingPayments] = await connection.execute(`
      SELECT 
        d.id,
        d.debtor_name,
        d.amount,
        d.description,
        d.due_date,
        d.status,
        d.category,
        d.reference_number,
        d.debtor_email,
        d.debtor_phone,
        'debt' as type,
        'pending' as payment_status
      FROM debts d
      WHERE d.user_id = ? AND d.status != 'paid'
      ORDER BY d.due_date ASC
    `, [userId]);
    
    res.json(pendingPayments);
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

// Get transaction history with pagination
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const offset = (safePage - 1) * safeLimit;
    
    let query = `
      SELECT 
        t.*,
        d.debtor_name,
        d.category as debt_category
      FROM transactions t
      LEFT JOIN debts d ON t.debt_id = d.id
      WHERE t.user_id = ?
    `;
    
    let params = [userId];
    
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    
    if (startDate && endDate) {
      query += ' AND DATE(t.transaction_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY t.transaction_date DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    
    const connection = await db;
    const [transactions] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = ?
    `;
    let countParams = [userId];
    
    if (type) {
      countQuery += ' AND t.type = ?';
      countParams.push(type);
    }
    
    if (startDate && endDate) {
      countQuery += ' AND DATE(t.transaction_date) BETWEEN ? AND ?';
      countParams.push(startDate, endDate);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      transactions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

module.exports = router;
