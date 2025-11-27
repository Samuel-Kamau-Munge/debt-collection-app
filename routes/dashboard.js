const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const config = require('../config/config');
  const JWT_SECRET = config.jwt.secret;

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Dashboard overview - get key statistics
router.get('/overview', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await db;
    
    // Get total outstanding debts with overdue count
    const [debtResults] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_debts,
        COUNT(*) as debt_count,
        COALESCE(SUM(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN amount ELSE 0 END), 0) as overdue_amount,
        COUNT(CASE WHEN due_date < CURDATE() AND status != 'paid' THEN 1 END) as overdue_count
      FROM debts 
      WHERE user_id = ?
    `, [userId]);

    // Get total credits with utilization
    const [creditResults] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_credits,
        COUNT(*) as credit_count,
        COALESCE(SUM(credit_limit), 0) as total_credit_limit,
        CASE 
          WHEN SUM(credit_limit) > 0 THEN 
            ROUND((SUM(amount) / SUM(credit_limit)) * 100, 2)
          ELSE 0 
        END as credit_utilization,
        COALESCE(SUM(credit_limit - amount), 0) as available_credit
      FROM credits 
      WHERE user_id = ? AND status = 'active'
    `, [userId]);

    // Get recent transactions
    const [transactionResults] = await connection.execute(`
      SELECT 
        t.*
      FROM transactions t
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [userId]);

    // Ensure we have valid results
    const debtData = debtResults[0] || { total_debts: 0, debt_count: 0, overdue_amount: 0, overdue_count: 0 };
    const creditData = creditResults[0] || { total_credits: 0, credit_count: 0, total_credit_limit: 0, credit_utilization: 0, available_credit: 0 };

    res.json({
      overview: {
        totalOutstandingDebts: parseFloat(debtData.total_debts) || 0,
        totalCredits: parseFloat(creditData.total_credits) || 0,
        overduePayments: parseFloat(debtData.overdue_amount) || 0,
        debtCount: parseInt(debtData.debt_count) || 0,
        creditCount: parseInt(creditData.credit_count) || 0,
        overdueCount: parseInt(debtData.overdue_count) || 0,
        creditUtilization: parseFloat(creditData.credit_utilization) || 0,
        availableCredit: parseFloat(creditData.available_credit) || 0
      },
      recentTransactions: transactionResults || []
    });
  } catch (error) {
    console.error('Overview endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics data
router.get('/analytics', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query; // days or labels like 30d, 90d, 1y

  try {
    const connection = await db;
    
    // Normalize/validate period parameter to number of days
    let queryPeriodDays = 30;
    if (typeof period === 'string') {
      const lower = period.toLowerCase();
      if (['7','30','90','365'].includes(lower)) {
        queryPeriodDays = parseInt(lower, 10);
      } else if (lower.endsWith('d')) {
        const n = parseInt(lower.replace('d',''), 10);
        queryPeriodDays = Number.isFinite(n) ? n : 30;
      } else if (lower === '1y' || lower === '12m' || lower === 'year') {
        queryPeriodDays = 365;
      }
    }

    // Get debt trends
    const debtTrendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM debts 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get payment trends
    const paymentTrendQuery = `
      SELECT 
        DATE(transaction_date) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions 
      WHERE user_id = ? AND type = 'payment_received' AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(transaction_date)
      ORDER BY date DESC
    `;

    // Get debt by category - include all statuses and handle null categories
    const categoryQuery = `
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM debts 
      WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total_amount DESC
    `;

    // Get credit by category - summarize active credit accounts by used amount
    const creditCategoryQuery = `
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM credits 
      WHERE user_id = ? AND status = 'active'
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total_amount DESC
    `;

    // Get recent transactions for activity
    const recentTransactionsQuery = `
      SELECT 
        id,
        payer_name,
        amount,
        type,
        transaction_date,
        created_at
      FROM transactions
      WHERE user_id = ?
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 10
    `;

    // Get performance metrics - include 'active' status in active debts
    const performanceQuery = `
      SELECT 
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status = 'paid') as paid_debts,
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')) as active_debts,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'payment_received') as total_collected,
        (SELECT COALESCE(SUM(amount), 0) FROM debts WHERE user_id = ? AND status IN ('pending', 'overdue', 'active')) as total_outstanding
    `;

    // Execute all queries in parallel
    const [debtTrends] = await connection.execute(debtTrendQuery, [userId, queryPeriodDays]);
    const [paymentTrends] = await connection.execute(paymentTrendQuery, [userId, queryPeriodDays]);
    const [categories] = await connection.execute(categoryQuery, [userId]);
    const [creditCategories] = await connection.execute(creditCategoryQuery, [userId]);
    const [recentTx] = await connection.execute(recentTransactionsQuery, [userId]);
    const [performanceResults] = await connection.execute(performanceQuery, [userId, userId, userId, userId]);

    const performanceData = performanceResults[0] || { paid_debts: 0, active_debts: 0, total_collected: 0, total_outstanding: 0 };
    
    res.json({
      debtTrends: debtTrends || [],
      paymentTrends: paymentTrends || [],
      debtByCategory: categories || [],
      creditByCategory: creditCategories || [],
      recentTransactions: recentTx || [],
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

// Get reports data
router.get('/reports', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate, type = 'summary' } = req.query;

  try {
    const connection = await db;
    
    // Validate and build date filter
    let dateFilter = '';
    let params = [userId];

    if (startDate && endDate) {
      // Validate date format
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      
      if (start > end) {
        return res.status(400).json({ error: 'Start date cannot be after end date' });
      }
      
      dateFilter = 'AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Validate report type
    const validTypes = ['summary', 'detailed', 'debt-analysis', 'payment-analysis', 'category-breakdown'];
    const reportType = validTypes.includes(type) ? type : 'summary';

    if (reportType === 'summary') {
      // Enhanced summary report with min/max values
      const summaryQuery = `
        SELECT 
          'debts' as type,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MIN(amount), 0) as min_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM debts 
        WHERE user_id = ? ${dateFilter}
        
        UNION ALL
        
        SELECT 
          'credits' as type,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MIN(amount), 0) as min_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM credits 
        WHERE user_id = ? ${dateFilter}
        
        UNION ALL
        
        SELECT 
          'transactions' as type,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MIN(amount), 0) as min_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM transactions 
        WHERE user_id = ? ${dateFilter}
      `;

      const [results] = await connection.execute(summaryQuery, [...params, ...params, ...params]);
      
      // Add metadata to the response
      res.json({ 
        summary: results || [],
        metadata: {
          reportType: 'summary',
          generatedAt: new Date().toISOString(),
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          recordCount: results ? results.length : 0
        }
      });
    } else if (reportType === 'detailed') {
      // Detailed report with all debt information
      const detailedQuery = `
        SELECT 
          d.*,
          (SELECT COUNT(*) FROM transactions t WHERE t.debt_id = d.id) as transaction_count,
          (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.debt_id = d.id AND t.type = 'payment_received') as total_paid
        FROM debts d
        WHERE d.user_id = ? ${dateFilter}
        ORDER BY d.created_at DESC
      `;

      const [results] = await connection.execute(detailedQuery, params);
      
      res.json({ 
        detailed: results || [],
        metadata: {
          reportType: 'detailed',
          generatedAt: new Date().toISOString(),
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          recordCount: results ? results.length : 0
        }
      });
    } else if (reportType === 'debt-analysis') {
      // Debt analysis report
      const debtAnalysisQuery = `
        SELECT 
          category,
          status,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(MIN(amount), 0) as min_amount,
          COALESCE(MAX(amount), 0) as max_amount
        FROM debts 
        WHERE user_id = ? ${dateFilter}
        GROUP BY category, status
        ORDER BY category, status
      `;

      const [results] = await connection.execute(debtAnalysisQuery, params);
      
      res.json({ 
        debtAnalysis: results || [],
        metadata: {
          reportType: 'debt-analysis',
          generatedAt: new Date().toISOString(),
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          recordCount: results ? results.length : 0
        }
      });
    } else if (reportType === 'payment-analysis') {
      // Payment analysis report
      const paymentAnalysisQuery = `
        SELECT 
          type,
          DATE(transaction_date) as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount
        FROM transactions 
        WHERE user_id = ? ${dateFilter}
        GROUP BY type, DATE(transaction_date)
        ORDER BY date DESC, type
      `;

      const [results] = await connection.execute(paymentAnalysisQuery, params);
      
      res.json({ 
        paymentAnalysis: results || [],
        metadata: {
          reportType: 'payment-analysis',
          generatedAt: new Date().toISOString(),
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          recordCount: results ? results.length : 0
        }
      });
    } else if (reportType === 'category-breakdown') {
      // Category breakdown report
      const categoryBreakdownQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
        FROM debts 
        WHERE user_id = ? ${dateFilter}
        GROUP BY category
        ORDER BY total_amount DESC
      `;

      const [results] = await connection.execute(categoryBreakdownQuery, params);
      
      res.json({ 
        categoryBreakdown: results || [],
        metadata: {
          reportType: 'category-breakdown',
          generatedAt: new Date().toISOString(),
          dateRange: startDate && endDate ? { startDate, endDate } : null,
          recordCount: results ? results.length : 0
        }
      });
    }
  } catch (error) {
    console.error('Reports endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly trends for overview
router.get('/monthly-trends', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { months = 6 } = req.query;

  try {
    // Validate months parameter
    const validMonths = parseInt(months);
    if (isNaN(validMonths) || validMonths < 1 || validMonths > 24) {
      return res.status(400).json({ error: 'Invalid months parameter. Must be between 1 and 24.' });
    }

    const connection = await db;
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM debts 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT ?
    `;

    const [results] = await connection.execute(trendsQuery, [userId, validMonths, validMonths]);
    res.json(results || []);
  } catch (error) {
    console.error('Monthly trends endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get debt categories for overview
router.get('/debt-categories', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await db;
    const categoriesQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM debts 
      WHERE user_id = ? AND status IN ('pending', 'overdue')
      GROUP BY category
      ORDER BY total DESC
    `;

    const [results] = await connection.execute(categoriesQuery, [userId]);
    res.json(results || []);
  } catch (error) {
    console.error('Debt categories endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming payments for overview
router.get('/upcoming-payments', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  try {
    // Validate days parameter
    const validDays = parseInt(days);
    if (isNaN(validDays) || validDays < 1 || validDays > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }

    const connection = await db;
    const upcomingQuery = `
      SELECT 
        d.id,
        d.debtor_name,
        d.amount,
        d.description,
        d.due_date as debt_due_date,
        ps.due_date as payment_due_date,
        ps.amount as payment_amount,
        CASE 
          WHEN ps.due_date IS NOT NULL THEN ps.due_date 
          ELSE d.due_date 
        END as due_date
      FROM debts d
      LEFT JOIN payment_schedules ps ON d.id = ps.debt_id
      WHERE d.user_id = ? 
        AND d.status IN ('pending', 'overdue')
        AND (
          ps.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
          OR (d.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY) AND ps.id IS NULL)
        )
      ORDER BY 
        CASE 
          WHEN ps.due_date IS NOT NULL THEN ps.due_date 
          ELSE d.due_date 
        END ASC
      LIMIT 10
    `;

    const [results] = await connection.execute(upcomingQuery, [userId, validDays, validDays]);
    res.json(results || []);
  } catch (error) {
    console.error('Upcoming payments endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics summary
router.get('/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await db;
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM debts WHERE user_id = ?) as total_debts,
        (SELECT COUNT(*) FROM credits WHERE user_id = ?) as total_credits,
        (SELECT COUNT(*) FROM transactions WHERE user_id = ?) as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM debts WHERE user_id = ? AND status IN ('pending', 'overdue')) as outstanding_debts,
        (SELECT COALESCE(SUM(amount), 0) FROM credits WHERE user_id = ? AND status = 'active') as active_credits,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'payment_received') as total_collected,
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status = 'overdue') as overdue_count,
        (SELECT COUNT(*) FROM debts WHERE user_id = ? AND status = 'paid') as paid_count
    `;

    const [results] = await connection.execute(statsQuery, [userId, userId, userId, userId, userId, userId, userId, userId]);
    const stats = results[0] || {};
    
    res.json({
      totalDebts: parseInt(stats.total_debts) || 0,
      totalCredits: parseInt(stats.total_credits) || 0,
      totalTransactions: parseInt(stats.total_transactions) || 0,
      outstandingDebts: parseFloat(stats.outstanding_debts) || 0,
      activeCredits: parseFloat(stats.active_credits) || 0,
      totalCollected: parseFloat(stats.total_collected) || 0,
      overdueCount: parseInt(stats.overdue_count) || 0,
      paidCount: parseInt(stats.paid_count) || 0
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent activity for dashboard
router.get('/recent-activity', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { limit = 10 } = req.query;

  try {
    const validLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 records
    const connection = await db;

    const activityQuery = `
      (
        SELECT 
          'debt' as type,
          id,
          debtor_name as name,
          amount,
          created_at,
          status
        FROM debts 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
      UNION ALL
      (
        SELECT 
          'credit' as type,
          id,
          creditor_name as name,
          amount,
          created_at,
          status
        FROM credits 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
      UNION ALL
      (
        SELECT 
          'transaction' as type,
          id,
          payer_name as name,
          amount,
          created_at,
          type as status
        FROM transactions 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [results] = await connection.execute(activityQuery, [userId, validLimit, userId, validLimit, userId, validLimit, validLimit]);
    res.json(results || []);
  } catch (error) {
    console.error('Recent activity endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', authenticateToken, (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      user: req.user.id
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
