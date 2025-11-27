const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const notificationService = require('../services/notificationService');

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

// Get all credits for a user
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    // Use user from token or fallback to user 2 for testing
    const userId = req.user?.id || 2;
    
    console.log(`[Credits API] Starting query for user ${userId}...`);
    const connection = await db;
    
    // Single query to get both credits and count
    const [credits] = await connection.execute(
      'SELECT * FROM credits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    
    const queryTime = Date.now() - startTime;
    console.log(`[Credits API] Query completed in ${queryTime}ms, found ${credits.length} credits`);
    
    // Get total count (only if needed, can be removed if not used)
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM credits WHERE user_id = ?',
      [userId]
    );
    const total = countResult[0].total;
    
    const totalTime = Date.now() - startTime;
    console.log(`[Credits API] Total response time: ${totalTime}ms`);
    
    res.json({
      credits: credits || [],
      total: total,
      message: 'Credits retrieved successfully'
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[Credits API] Error after ${errorTime}ms:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get credit summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;

    // Get total credit limit from existing credits table
    const [creditLimitResult] = await connection.execute(
      'SELECT COALESCE(SUM(credit_limit), 0) as total_credit_limit FROM credits WHERE user_id = ? AND status = "active"',
      [userId]
    );

    // Get used credit (amount field represents used credit)
    const [usedCreditResult] = await connection.execute(
      'SELECT COALESCE(SUM(amount), 0) as used_credit FROM credits WHERE user_id = ? AND status = "active"',
      [userId]
    );

    // Get active accounts count
    const [activeAccountsResult] = await connection.execute(
      'SELECT COUNT(*) as active_accounts FROM credits WHERE user_id = ? AND status = "active"',
      [userId]
    );

    const totalCreditLimit = creditLimitResult[0].total_credit_limit;
    const usedCredit = usedCreditResult[0].used_credit;
    const availableCredit = totalCreditLimit - usedCredit;
    const creditUtilization = totalCreditLimit > 0 ? Math.round((usedCredit / totalCreditLimit) * 100) : 0;

    res.json({
      totalCreditLimit,
      availableCredit,
      creditUtilization,
      activeAccounts: activeAccountsResult[0].active_accounts
    });

  } catch (error) {
    console.error('Error fetching credit summary:', error);
    res.status(500).json({ error: 'Failed to fetch credit summary' });
  }
});

// Get credit accounts
router.get('/accounts', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;

    const [accounts] = await connection.execute(
      `SELECT 
        id,
        creditor_name as account_name,
        credit_limit,
        amount as used_credit,
        (credit_limit - amount) as available_credit,
        CASE 
          WHEN credit_limit > 0 THEN ROUND((amount / credit_limit) * 100, 2)
          ELSE 0 
        END as utilization_percentage,
        status,
        created_at,
        updated_at
      FROM credits 
      WHERE user_id = ? 
      ORDER BY created_at DESC`,
      [userId]
    );

    res.json(accounts);

  } catch (error) {
    console.error('Error fetching credit accounts:', error);
    res.status(500).json({ error: 'Failed to fetch credit accounts' });
  }
});

// Create credit account
router.post('/accounts', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const { account_name, credit_limit, description } = req.body;

    if (!account_name || !credit_limit) {
      return res.status(400).json({ error: 'Account name and credit limit are required' });
    }

    if (credit_limit <= 0) {
      return res.status(400).json({ error: 'Credit limit must be greater than 0' });
    }

    const connection = await db;

    const [result] = await connection.execute(
      `INSERT INTO credits 
       (user_id, creditor_name, amount, credit_limit, category, description, status, created_at, updated_at)
       VALUES (?, ?, 0, ?, 'credit_line', ?, 'active', NOW(), NOW())`,
      [userId, account_name, credit_limit, description || '']
    );

    const accountId = result.insertId;

    // Create notification for credit account creation
    await notificationService.createNotification(
      userId,
      'system',
      'New Credit Account Created',
      `Credit account "${account_name}" created with limit of Ksh ${parseFloat(credit_limit).toLocaleString()}`,
      accountId,
      'credit'
    );

    // Get the created account
    const [newAccount] = await connection.execute(
      'SELECT * FROM credits WHERE id = ?',
      [accountId]
    );

    res.status(201).json({
      message: 'Credit account created successfully',
      account: newAccount[0]
    });

  } catch (error) {
    console.error('Error creating credit account:', error);
    res.status(500).json({ error: 'Failed to create credit account' });
  }
});

// Update credit account
router.put('/accounts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const { id } = req.params;
    const { account_name, credit_limit, description, status } = req.body;

    const connection = await db;

    // Check if account exists and belongs to user
    const [existingAccount] = await connection.execute(
      'SELECT * FROM credits WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingAccount.length === 0) {
      return res.status(404).json({ error: 'Credit account not found or access denied' });
    }

    const account = existingAccount[0];
    const newCreditLimit = credit_limit || account.credit_limit;
    const newUsedCredit = account.amount;
    const newAvailableCredit = newCreditLimit - newUsedCredit;

    await connection.execute(
      `UPDATE credits 
       SET creditor_name = ?, credit_limit = ?, description = ?, status = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        account_name || account.creditor_name,
        newCreditLimit,
        description || account.description,
        status || account.status,
        id,
        userId
      ]
    );

    // Get updated account
    const [updatedAccount] = await connection.execute(
      'SELECT * FROM credits WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Credit account updated successfully',
      account: updatedAccount[0]
    });

  } catch (error) {
    console.error('Error updating credit account:', error);
    res.status(500).json({ error: 'Failed to update credit account' });
  }
});

// Delete credit account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const { id } = req.params;

    const connection = await db;

    // Check if account exists and belongs to user
    const [existingAccount] = await connection.execute(
      'SELECT * FROM credits WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingAccount.length === 0) {
      return res.status(404).json({ error: 'Credit account not found or access denied' });
    }

    // Check if account has used credit
    if (existingAccount[0].amount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account with used credit. Please clear all credit usage first.' 
      });
    }

    await connection.execute(
      'DELETE FROM credits WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ message: 'Credit account deleted successfully' });

  } catch (error) {
    console.error('Error deleting credit account:', error);
    res.status(500).json({ error: 'Failed to delete credit account' });
  }
});

// Ensure credit_transactions table exists
async function ensureCreditTransactionsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      credit_account_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      transaction_type VARCHAR(20) NOT NULL,
      description TEXT,
      transaction_date DATETIME NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_account (credit_account_id),
      INDEX idx_date (transaction_date)
    ) ENGINE=InnoDB;
  `);
}

// Get recent credit transactions
router.get('/transactions/recent', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const limitRaw = parseInt(req.query.limit);
    const safeLimit = Number.isNaN(limitRaw) ? 10 : Math.max(1, Math.min(500, limitRaw));

    const connection = await db;
    await ensureCreditTransactionsTable(connection);

    const [rows] = await connection.execute(
      `SELECT 
         ct.id,
         ct.credit_account_id,
         ct.amount,
         ct.transaction_type,
         ct.description,
         ct.transaction_date,
         ct.status,
         c.creditor_name AS account_name
       FROM credit_transactions ct
       LEFT JOIN credits c ON ct.credit_account_id = c.id
       WHERE ct.user_id = ?
       ORDER BY ct.transaction_date DESC, ct.created_at DESC
       LIMIT ${safeLimit}`,
      [userId]
    );

    res.json(rows);

  } catch (error) {
    console.error('Error fetching recent credit transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent credit transactions' });
  }
});

// Create credit transaction
router.post('/transactions', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { credit_account_id, amount, transaction_type, description } = req.body;

    if (!credit_account_id || !amount || !transaction_type) {
      return res.status(400).json({ 
        error: 'Credit account ID, amount, and transaction type are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const connection = await db;

    // Check if credit account exists and belongs to user
    const [creditAccount] = await connection.execute(
      'SELECT * FROM credits WHERE id = ? AND user_id = ?',
      [credit_account_id, userId]
    );

    if (creditAccount.length === 0) {
      return res.status(404).json({ error: 'Credit account not found or access denied' });
    }

    const account = creditAccount[0];
    const currentAmount = parseFloat(account.amount) || 0;
    const creditLimit = parseFloat(account.credit_limit) || 0;
    const availableCredit = creditLimit - currentAmount;

    // Check if transaction is valid
    if (transaction_type === 'withdrawal' && amount > availableCredit) {
      return res.status(400).json({ 
        error: 'Insufficient available credit for this transaction' 
      });
    }

    // Calculate new credit values
    let newAmount;
    if (transaction_type === 'withdrawal') {
      newAmount = currentAmount + amount;
    } else if (transaction_type === 'payment') {
      newAmount = Math.max(0, currentAmount - amount);
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Update credit account used amount
    await connection.execute(
      'UPDATE credits SET amount = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [newAmount, credit_account_id, userId]
    );

    // Ensure transactions table exists, then insert record
    await ensureCreditTransactionsTable(connection);
    const [insertResult] = await connection.execute(
      `INSERT INTO credit_transactions (user_id, credit_account_id, amount, transaction_type, description, transaction_date, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 'completed')`,
      [userId, credit_account_id, amount, transaction_type, description || '']
    );

    const insertId = insertResult.insertId;
    const [newTxRows] = await connection.execute(
      `SELECT 
         ct.id,
         ct.credit_account_id,
         ct.amount,
         ct.transaction_type,
         ct.description,
         ct.transaction_date,
         ct.status,
         c.creditor_name AS account_name
       FROM credit_transactions ct
       LEFT JOIN credits c ON ct.credit_account_id = c.id
       WHERE ct.id = ? AND ct.user_id = ?`,
      [insertId, userId]
    );

    const tx = newTxRows[0];

    // Create notification for credit transaction (non-blocking)
    try {
      await notificationService.createNotification(
        userId,
        'system',
        transaction_type === 'withdrawal' ? 'Credit Used' : 'Credit Payment',
        `${transaction_type === 'withdrawal' ? 'Used' : 'Paid'} Ksh ${parseFloat(amount).toLocaleString()} on account ${tx.account_name}`,
        tx.credit_account_id,
        null
      );
    } catch (notifErr) {
      console.warn('Notification creation failed, continuing:', notifErr.message);
    }

    res.status(201).json({
      message: 'Credit transaction processed successfully',
      transaction: tx
    });

  } catch (error) {
    console.error('Error creating credit transaction:', error);
    res.status(500).json({ error: 'Failed to create credit transaction' });
  }
});

// Get credit categories
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user?.id || 2;
    const connection = await db;

    const [categories] = await connection.execute(
      `SELECT
        category as category_name,
        COUNT(*) as account_count,
        SUM(credit_limit) as total_amount
      FROM credits
      WHERE user_id = ? AND status = 'active' AND category IS NOT NULL
      GROUP BY category
      ORDER BY total_amount DESC`,
      [userId]
    );

    res.json(categories);

  } catch (error) {
    console.error('Error fetching credit categories:', error);
    res.status(500).json({ error: 'Failed to fetch credit categories' });
  }
});

// Add individual creditor
router.post('/creditors', async (req, res) => {
  try {
    const userId = req.user.id;
    const { creditor_name, creditor_email, creditor_phone, description } = req.body;

    if (!creditor_name) {
      return res.status(400).json({ error: 'Creditor name is required' });
    }

    const connection = await db;

    // Check if creditor already exists for this user
    const [existingCreditor] = await connection.execute(
      'SELECT id FROM creditors WHERE user_id = ? AND creditor_name = ?',
      [userId, creditor_name]
    );

    if (existingCreditor.length > 0) {
      return res.status(409).json({ error: 'Creditor with this name already exists' });
    }

    const [result] = await connection.execute(
      `INSERT INTO creditors
       (user_id, creditor_name, creditor_email, creditor_phone, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, creditor_name, creditor_email || null, creditor_phone || null, description || null]
    );

    const creditorId = result.insertId;

    // Create notification for creditor creation
    await notificationService.createNotification(
      userId,
      'system',
      'New Creditor Added',
      `Creditor "${creditor_name}" has been added to your system`,
      creditorId,
      'creditor'
    );

    res.status(201).json({
      message: 'Creditor added successfully',
      creditor: {
        id: creditorId,
        creditor_name,
        creditor_email,
        creditor_phone,
        description
      }
    });

  } catch (error) {
    console.error('Error adding creditor:', error);
    res.status(500).json({ error: 'Failed to add creditor' });
  }
});

// Get all creditors for a user
router.get('/creditors', async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await db;

    const [creditors] = await connection.execute(
      'SELECT * FROM creditors WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(creditors);

  } catch (error) {
    console.error('Error fetching creditors:', error);
    res.status(500).json({ error: 'Failed to fetch creditors' });
  }
});

// Add individual debtor
router.post('/debtors', async (req, res) => {
  try {
    const userId = req.user.id;
    const { debtor_name, debtor_email, debtor_phone, description } = req.body;

    if (!debtor_name) {
      return res.status(400).json({ error: 'Debtor name is required' });
    }

    const connection = await db;

    // Check if debtor already exists for this user
    const [existingDebtor] = await connection.execute(
      'SELECT id FROM debtors WHERE user_id = ? AND debtor_name = ?',
      [userId, debtor_name]
    );

    if (existingDebtor.length > 0) {
      return res.status(409).json({ error: 'Debtor with this name already exists' });
    }

    const [result] = await connection.execute(
      `INSERT INTO debtors
       (user_id, debtor_name, debtor_email, debtor_phone, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, debtor_name, debtor_email || null, debtor_phone || null, description || null]
    );

    const debtorId = result.insertId;

    // Create notification for debtor creation
    await notificationService.createNotification(
      userId,
      'system',
      'New Debtor Added',
      `Debtor "${debtor_name}" has been added to your system`,
      debtorId,
      'debtor'
    );

    res.status(201).json({
      message: 'Debtor added successfully',
      debtor: {
        id: debtorId,
        debtor_name,
        debtor_email,
        debtor_phone,
        description
      }
    });

  } catch (error) {
    console.error('Error adding debtor:', error);
    res.status(500).json({ error: 'Failed to add debtor' });
  }
});

// Get all debtors for a user
router.get('/debtors', async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await db;

    const [debtors] = await connection.execute(
      'SELECT * FROM debtors WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(debtors);

  } catch (error) {
    console.error('Error fetching debtors:', error);
    res.status(500).json({ error: 'Failed to fetch debtors' });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const connection = await db;
    await ensureCreditTransactionsTable(connection);

    const [rows] = await connection.execute(
      `SELECT 
         ct.id,
         ct.credit_account_id,
         ct.amount,
         ct.transaction_type,
         ct.description,
         ct.transaction_date,
         ct.status,
         c.creditor_name AS account_name
       FROM credit_transactions ct
       LEFT JOIN credits c ON ct.credit_account_id = c.id
       WHERE ct.id = ? AND ct.user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error('Error fetching transaction by id:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

module.exports = router;
