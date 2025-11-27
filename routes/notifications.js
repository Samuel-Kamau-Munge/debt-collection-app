const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { validate, schemas } = require('../middleware/validation');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  const jwt = require('jsonwebtoken');
  const config = require('../config/config');

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403));
    }
    req.user = user;
    next();
  });
};

// Debug endpoints (no auth required)
router.get('/debug/scheduler', async (req, res, next) => {
  try {
    const notificationScheduler = require('../services/notificationScheduler');
    
    const status = {
      isRunning: notificationScheduler.isRunning,
      intervalId: notificationScheduler.intervalId,
      timestamp: new Date().toISOString()
    };
    
    // If scheduler is not running, start it
    if (!notificationScheduler.isRunning) {
      notificationScheduler.start();
      status.message = 'Scheduler was not running, started it now';
      status.isRunning = true;
    } else {
      status.message = 'Scheduler is running normally';
    }
    
    res.json(status);
  } catch (error) {
    logger.error('Failed to check scheduler status', { 
      error: error.message 
    });
    next(error);
  }
});

router.post('/debug/trigger-scheduler', async (req, res, next) => {
  try {
    const notificationScheduler = require('../services/notificationScheduler');
    
    // Run all checks manually
    await notificationScheduler.runAllChecks();
    
    res.json({ 
      message: 'Scheduler triggered manually',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to trigger scheduler manually', { 
      error: error.message 
    });
    next(error);
  }
});

// Apply authentication to all routes - temporarily disabled for testing
// router.use(authenticateToken);

// Get user notifications with pagination
router.get('/', validate(schemas.pagination, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Use user from token or fallback to user 2 for testing
    const userId = req.user?.id || 2;
    
    const notifications = await notificationService.getUserNotifications(
      userId, 
      parseInt(limit), 
      offset
    );
    
    const unreadCount = await notificationService.getUnreadCount(userId);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadCount
      }
    });
  } catch (error) {
    logger.error('Failed to get notifications', { error: error.message, userId: req.user?.id || 2 });
    next(error);
  }
});

// Get unread notification count
router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = req.user?.id || 2;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ unreadCount: count });
  } catch (error) {
    logger.error('Failed to get unread count', { error: error.message, userId: req.user?.id || 2 });
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', validate(schemas.idParam, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await notificationService.markAsRead(id, req.user.id);
    
    if (!success) {
      return next(new AppError('Notification not found', 404));
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Failed to mark notification as read', { 
      error: error.message, 
      notificationId: req.params.id, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res, next) => {
  try {
    const affectedRows = await notificationService.markAllAsRead(req.user.id);
    res.json({ 
      message: 'All notifications marked as read',
      affectedRows 
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Delete notification
router.delete('/:id', validate(schemas.idParam, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = require('../config/database');
    const connection = await db;
    
    const [result] = await connection.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return next(new AppError('Notification not found', 404));
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete notification', { 
      error: error.message, 
      notificationId: req.params.id, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get notifications by type
router.get('/type/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const offset = (safePage - 1) * safeLimit;
    
    const db = require('../config/database');
    const connection = await db;
    
    const [notifications] = await connection.execute(
      `SELECT * FROM notifications
       WHERE user_id = ? AND type = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, type, safeLimit, offset]
    );
    
    res.json({ notifications });
  } catch (error) {
    logger.error('Failed to get notifications by type', { 
      error: error.message, 
      type: req.params.type, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get notification statistics
router.get('/stats', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const connection = await db;
    
    const [stats] = await connection.execute(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread,
        COUNT(CASE WHEN type = 'payment_due' THEN 1 END) as payment_due,
        COUNT(CASE WHEN type = 'payment_overdue' THEN 1 END) as payment_overdue,
        COUNT(CASE WHEN type = 'credit_limit' THEN 1 END) as credit_limit,
        COUNT(CASE WHEN type = 'system' THEN 1 END) as system
       FROM notifications
       WHERE user_id = ?`,
      [req.user.id]
    );
    
    res.json(stats[0]);
  } catch (error) {
    logger.error('Failed to get notification stats', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Create custom notification (admin/system use)
router.post('/create', async (req, res, next) => {
  try {
    const { type, title, message, relatedId, relatedType, priority = 'medium' } = req.body;
    
    if (!type || !title || !message) {
      return next(new AppError('Type, title, and message are required', 400));
    }
    
    // Delegate to service which normalizes type/priority and falls back for legacy schemas
    const notificationId = await notificationService.createNotification(
      req.user.id,
      type,
      title,
      message,
      relatedId,
      relatedType,
      priority
    );
    
    logger.info('Custom notification created', {
      notificationId,
      userId: req.user.id,
      type,
      title,
      priority
    });
    
    res.status(201).json({
      message: 'Notification created successfully',
      notificationId
    });
  } catch (error) {
    logger.error('Failed to create custom notification', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Clean up old notifications (admin/system use)
router.delete('/cleanup', async (req, res, next) => {
  try {
    const deletedCount = await notificationService.cleanupOldNotifications();
    res.json({ 
      message: 'Old notifications cleaned up successfully',
      deletedCount 
    });
  } catch (error) {
    logger.error('Failed to cleanup old notifications', { 
      error: error.message 
    });
    next(error);
  }
});

module.exports = router;
