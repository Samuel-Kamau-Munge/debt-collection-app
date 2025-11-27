const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Import configurations
const config = require('./config/config');
const db = require('./config/database');

const app = express();

// Basic middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Simple JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// API Routes
// Dashboard analytics
app.get('/api/dashboard/analytics', verifyToken, async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get debt trends for the last 30 days
    const [debtTrends] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM debts 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [req.user.id]);

    // Get payment trends
    const [paymentTrends] = await connection.execute(`
      SELECT 
        DATE(transaction_date) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions 
      WHERE user_id = ? AND type = 'payment_received' AND transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(transaction_date)
      ORDER BY date DESC
    `, [req.user.id]);

    // Get debt by category
    const [debtByCategory] = await connection.execute(`
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM debts 
      WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total_amount DESC
    `, [req.user.id]);

    // Get performance metrics
    const [performanceResults] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status = 'paid') as paid_debts,
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')) as active_debts,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'payment_received') as total_collected,
        (SELECT COALESCE(SUM(amount), 0) FROM debts WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')) as total_outstanding
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);

    connection.release();

    const performanceData = performanceResults[0] || { paid_debts: 0, active_debts: 0, total_collected: 0, total_outstanding: 0 };
    
    res.json({
      debtTrends: debtTrends || [],
      paymentTrends: paymentTrends || [],
      debtByCategory: debtByCategory || [],
      performance: {
        paidDebts: parseInt(performanceData.paid_debts) || 0,
        activeDebts: parseInt(performanceData.active_debts) || 0,
        totalCollected: parseFloat(performanceData.total_collected) || 0,
        totalOutstanding: parseFloat(performanceData.total_outstanding) || 0,
        collectionRate: performanceData.total_outstanding > 0 ? 
          ((performanceData.total_collected / performanceData.total_outstanding) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard reports
app.get('/api/dashboard/reports', verifyToken, async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get summary statistics
    const [summaryResults] = await connection.execute(`
      SELECT 
        'debts' as type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(MAX(amount), 0) as max_amount
      FROM debts 
      WHERE user_id = ?
      
      UNION ALL
      
      SELECT 
        'credits' as type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(MAX(amount), 0) as max_amount
      FROM credits 
      WHERE user_id = ?
      
      UNION ALL
      
      SELECT 
        'transactions' as type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(MAX(amount), 0) as max_amount
      FROM transactions 
      WHERE user_id = ?
    `, [req.user.id, req.user.id, req.user.id]);

    connection.release();
    
    res.json({ 
      summary: summaryResults || [],
      metadata: {
        reportType: 'summary',
        generatedAt: new Date().toISOString(),
        recordCount: summaryResults ? summaryResults.length : 0
      }
    });
  } catch (error) {
    console.error('Reports endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard overview
app.get('/api/dashboard/overview', verifyToken, async (req, res) => {
  try {
    const connection = await db.getConnection();
    
    // Get total outstanding debts with overdue count
    const [debtResults] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_debts,
        COUNT(*) as debt_count,
        COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN amount ELSE 0 END), 0) as overdue_amount,
        COUNT(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN 1 END) as overdue_count
      FROM debts 
      WHERE user_id = ?
    `, [req.user.id]);

    // Get total credits
    const [creditResults] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_credits,
        COUNT(*) as credit_count
      FROM credits 
      WHERE user_id = ? AND status = 'active'
    `, [req.user.id]);

    // Get recent transactions
    const [transactionResults] = await connection.execute(`
      SELECT 
        t.*
      FROM transactions t
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [req.user.id]);

    connection.release();

    const debtData = debtResults[0] || { total_debts: 0, debt_count: 0, overdue_amount: 0, overdue_count: 0 };
    const creditData = creditResults[0] || { total_credits: 0, credit_count: 0 };

    res.json({
      overview: {
        totalOutstandingDebts: parseFloat(debtData.total_debts) || 0,
        totalCredits: parseFloat(creditData.total_credits) || 0,
        overduePayments: parseFloat(debtData.overdue_amount) || 0,
        debtCount: parseInt(debtData.debt_count) || 0,
        creditCount: parseInt(creditData.credit_count) || 0,
        overdueCount: parseInt(debtData.overdue_count) || 0
      },
      recentTransactions: transactionResults || []
    });
  } catch (error) {
    console.error('Overview endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all debts
app.get('/api/debts', verifyToken, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [debts] = await connection.execute(
      'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM debts WHERE user_id = ?',
      [req.user.id]
    );
    
    connection.release();
    
    res.json({
      debts,
      pagination: {
        page: 1,
        limit: 20,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / 20)
      }
    });
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
});

// Get single debt
app.get('/api/debts/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await db.getConnection();
    
    const [debts] = await connection.execute(
      'SELECT * FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    connection.release();
    
    if (debts.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    res.json({ debt: debts[0] });
  } catch (error) {
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: 'Failed to fetch debt' });
  }
});

// Create debt
app.post('/api/debts', verifyToken, async (req, res) => {
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
    
    if (!debtor_name || !amount || !due_date) {
      return res.status(400).json({ error: 'Debtor name, amount, and due date are required' });
    }
    
    const connection = await db.getConnection();
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
        parseFloat(amount),
        description || null, 
        category || null, 
        due_date, 
        reference_number || null,
        parseFloat(interest_rate), 
        payment_terms || null, 
        notes || null
      ]
    );
    
    connection.release();
    
    res.status(201).json({
      message: 'Debt created successfully',
      debt: {
        id: result[0].insertId,
        debtor_name,
        amount: parseFloat(amount),
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Failed to create debt' });
  }
});

// Update debt
app.put('/api/debts/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const connection = await db.getConnection();
    const result = await connection.execute(
      `UPDATE debts SET 
        debtor_name = ?, debtor_email = ?, debtor_phone = ?, amount = ?,
        description = ?, category = ?, due_date = ?, reference_number = ?,
        interest_rate = ?, payment_terms = ?, notes = ?, status = ?
        WHERE id = ? AND user_id = ?`,
      [
        updateData.debtor_name,
        updateData.debtor_email,
        updateData.debtor_phone,
        updateData.amount,
        updateData.description,
        updateData.category,
        updateData.due_date,
        updateData.reference_number,
        updateData.interest_rate,
        updateData.payment_terms,
        updateData.notes,
        updateData.status,
        id,
        req.user.id
      ]
    );
    
    connection.release();
    
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    res.json({ message: 'Debt updated successfully' });
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Failed to update debt' });
  }
});

// Delete debt
app.delete('/api/debts/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await db.getConnection();
    
    const result = await connection.execute(
      'DELETE FROM debts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    connection.release();
    
    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    res.json({ message: 'Debt deleted successfully' });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const connection = await db.getConnection();
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Simple password check (in production, use bcrypt)
    if (password !== 'password123') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dashboard routes
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/general/dashboard.html');
});

app.get('/dashboard/general', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/general/dashboard.html');
});

app.get('/dashboard/overview/analytics', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/overview/analytics/index.html');
});

app.get('/dashboard/overview/reports', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/overview/reports/index.html');
});

app.get('/dashboard/debt-management/view-debts', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/debt-management/view-debts/index.html');
});

app.get('/dashboard/debt-management/record-debt', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard/debt-management/record-debt/index.html');
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Dashboard Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔗 View Debts: http://localhost:${PORT}/dashboard/debt-management/view-debts`);
});
