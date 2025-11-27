const express = require('express');
const router = express.Router();
const emailAlertService = require('../services/emailAlertService');
const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const config = require('../config/config');

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Apply authentication to all routes
router.use(authenticateToken);

// Send test email alert
router.post('/test', async (req, res) => {
  try {
    const { type = 'payment_received', amount = 1000, debtorName = 'Test User' } = req.body;
    
    const result = await emailAlertService.sendTransactionAlert(req.user.id, {
      type,
      amount: parseFloat(amount),
      debtorName,
      description: 'Test email alert from Debt Collection System'
    });

    if (result.success) {
      res.json({ 
        message: 'Test email alert sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test email alert',
        details: result.error 
      });
    }
  } catch (error) {
    logger.error('Failed to send test email alert', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to send test email alert' });
  }
});

// Send payment reminder email
router.post('/payment-reminder', async (req, res) => {
  try {
    const { debtorName, amount, dueDate, daysOverdue = 0 } = req.body;
    
    if (!debtorName || !amount || !dueDate) {
      return res.status(400).json({ 
        error: 'Debtor name, amount, and due date are required' 
      });
    }

    const result = await emailAlertService.sendPaymentReminderAlert(req.user.id, {
      debtorName,
      amount: parseFloat(amount),
      dueDate,
      daysOverdue: parseInt(daysOverdue)
    });

    if (result.success) {
      res.json({ 
        message: 'Payment reminder email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send payment reminder email',
        details: result.error 
      });
    }
  } catch (error) {
    logger.error('Failed to send payment reminder email', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to send payment reminder email' });
  }
});

// Send credit limit alert
router.post('/credit-limit-alert', async (req, res) => {
  try {
    const { creditorName, currentAmount, creditLimit, utilizationPercentage } = req.body;
    
    if (!creditorName || !currentAmount || !creditLimit || !utilizationPercentage) {
      return res.status(400).json({ 
        error: 'Creditor name, current amount, credit limit, and utilization percentage are required' 
      });
    }

    const result = await emailAlertService.sendCreditLimitAlert(req.user.id, {
      creditorName,
      currentAmount: parseFloat(currentAmount),
      creditLimit: parseFloat(creditLimit),
      utilizationPercentage: parseFloat(utilizationPercentage)
    });

    if (result.success) {
      res.json({ 
        message: 'Credit limit alert email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send credit limit alert email',
        details: result.error 
      });
    }
  } catch (error) {
    logger.error('Failed to send credit limit alert email', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to send credit limit alert email' });
  }
});

// Send bulk alert to all users
router.post('/bulk-alert', async (req, res) => {
  try {
    const { subject, message, alertType = 'system' } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Subject and message are required' 
      });
    }

    const result = await emailAlertService.sendBulkAlert(subject, message, alertType);

    if (result.success) {
      res.json({ 
        message: 'Bulk alert sent successfully',
        totalUsers: result.results.length,
        emailsSent: result.results.filter(r => r.success).length,
        results: result.results
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send bulk alert',
        details: result.error 
      });
    }
  } catch (error) {
    logger.error('Failed to send bulk alert', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to send bulk alert' });
  }
});

// Get email alert status
router.get('/status', async (req, res) => {
  try {
    const user = await emailAlertService.getUserById(req.user.id);
    
    res.json({
      emailConfigured: !!emailAlertService.transporter,
      userEmail: user ? user.email : null,
      hasEmail: !!(user && user.email),
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpUser: process.env.SMTP_USER || 'Not configured'
    });
  } catch (error) {
    logger.error('Failed to get email alert status', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to get email alert status' });
  }
});

// Get all users for bulk operations (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await emailAlertService.getAllUsers();
    
    res.json({
      totalUsers: users.length,
      usersWithEmail: users.filter(u => u.email).length,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name
      }))
    });
  } catch (error) {
    logger.error('Failed to get users for email alerts', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;




