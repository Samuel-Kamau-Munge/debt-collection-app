const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config/config');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    if (config.email.smtp.auth && config.email.smtp.auth.user && config.email.smtp.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(config.email.smtp);
      logger.info('Email service initialized', { 
        host: config.email.smtp.host,
        user: config.email.smtp.auth.user 
      });
    } else {
      logger.warn('Email service not configured - missing SMTP credentials');
    }
  }

  // Create notification in database
  async createNotification(userId, type, title, message, relatedId = null, relatedType = null, priority = 'medium') {
    try {
      const connection = await db;

      // Normalize type against known ENUM values
      const allowedTypes = new Set(['payment_due','payment_overdue','credit_limit','system','reminder','alert']);
      const normalizedType = allowedTypes.has(type) ? type : 'system';

      // Normalize priority values
      const allowedPriorities = new Set(['urgent','high','medium','low']);
      const normalizedPriority = allowedPriorities.has(priority) ? priority : 'medium';

      const [result] = await connection.execute(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type, priority, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, normalizedType, title, message, relatedId, relatedType, normalizedPriority]
      );

      logger.info('Notification created', {
        notificationId: result.insertId,
        userId,
        type: normalizedType,
        title,
        priority: normalizedPriority
      });

      // Emit real-time notification via Socket.IO
      this.emitRealtimeNotification(userId, {
        id: result.insertId,
        type: normalizedType,
        title,
        message,
        relatedId,
        relatedType,
        priority: normalizedPriority,
        is_read: false,
        created_at: new Date().toISOString()
      });

      return result.insertId;
    } catch (error) {
      // Fallback for legacy schema without 'priority' column
      if (/Unknown column 'priority'/.test(error.message) || /ER_BAD_FIELD_ERROR/.test(error.message)) {
        try {
          const connection = await db;

          const allowedTypes = new Set(['payment_due','payment_overdue','credit_limit','system','reminder','alert']);
          const normalizedType = allowedTypes.has(type) ? type : 'system';

          const [result] = await connection.execute(
            `INSERT INTO notifications (user_id, type, title, message, related_id, related_type, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [userId, normalizedType, title, message, relatedId, relatedType]
          );

          this.emitRealtimeNotification(userId, {
            id: result.insertId,
            type: normalizedType,
            title,
            message,
            relatedId,
            relatedType,
            priority: 'medium',
            is_read: false,
            created_at: new Date().toISOString()
          });

          logger.warn('Notification inserted without priority (legacy schema)', { notificationId: result.insertId, userId });
          return result.insertId;
        } catch (fallbackErr) {
          logger.error('Fallback insert failed for notification', { error: fallbackErr.message, userId, type });
          throw fallbackErr;
        }
      }

      logger.error('Failed to create notification', { error: error.message, userId, type });
      throw error;
    }
  }

  // Emit real-time notification to user
  emitRealtimeNotification(userId, notification) {
    try {
      if (global.io) {
        global.io.to(`user_${userId}`).emit('new_notification', notification);
        logger.info('Real-time notification emitted', { userId, notificationId: notification.id });
      } else {
        logger.warn('Socket.IO not available for real-time notification');
      }
    } catch (error) {
      logger.error('Failed to emit real-time notification', { error: error.message, userId });
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const connection = await db;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 50;
      const safeOffset = Number.isFinite(offsetNum) && offsetNum >= 0 ? offsetNum : 0;

      const [notifications] = await connection.execute(
        `SELECT * FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        [userId]
      );

      return notifications;
    } catch (error) {
      logger.error('Failed to get user notifications', { error: error.message, userId });
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const connection = await db;
      const [result] = await connection.execute(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Failed to mark notification as read', { error: error.message, notificationId, userId });
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const connection = await db;
      const [result] = await connection.execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      logger.info('All notifications marked as read', { userId, affectedRows: result.affectedRows });
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { error: error.message, userId });
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    try {
      const connection = await db;
      const [result] = await connection.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      return result[0].count;
    } catch (error) {
      logger.error('Failed to get unread notification count', { error: error.message, userId });
      throw error;
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not configured, skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: config.email.from || config.email.smtp.auth.user,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error: error.message, to, subject });
      throw error;
    }
  }

  // Send payment reminder email
  async sendPaymentReminderEmail(to, debtorName, amount, dueDate) {
    const subject = 'Payment Reminder - Debt Manager Pro';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #e74c3c; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Hello ${debtorName},</h2>
            <p>This is a friendly reminder that you have a payment due:</p>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
            </ul>
            <p>Please contact us to arrange payment as soon as possible.</p>
            <p>If you have already made this payment, please ignore this reminder.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Phone: +254 112 851 330<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  // Send overdue payment email
  async sendOverdueEmail(to, debtorName, amount, daysOverdue) {
    const subject = 'URGENT: Overdue Payment - Debt Manager Pro';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Overdue Payment Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #e74c3c; }
          .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ OVERDUE PAYMENT ALERT</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Hello ${debtorName},</h2>
            <div class="urgent">
              <h3>URGENT NOTICE</h3>
              <p>Your payment is now <strong>${daysOverdue} days overdue</strong>.</p>
            </div>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
            </ul>
            <p><strong>Please contact us immediately to avoid further action.</strong></p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Phone: +254 112 851 330<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  // Send payment confirmation email
  async sendPaymentConfirmationEmail(to, debtorName, amount) {
    const subject = 'Payment Received - Debt Manager Pro';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #27ae60; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Received</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Thank you, ${debtorName}!</h2>
            <p>We have successfully received your payment:</p>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>Your account is now up to date. Thank you for your prompt payment!</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Phone: +254 112 851 330<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(to, subject, html);
  }

  // Payment due notification
  async notifyPaymentDue(debtId, userId) {
    try {
      const connection = await db;
      
      // Get debt details
      const [debts] = await connection.execute(
        'SELECT * FROM debts WHERE id = ? AND user_id = ?',
        [debtId, userId]
      );

      if (debts.length === 0) return;

      const debt = debts[0];
      const title = 'Payment Due Reminder';
      const message = `Payment of Ksh ${debt.amount.toLocaleString()} is due for ${debt.debtor_name} on ${debt.due_date}`;

      // Create notification
      await this.createNotification(
        userId,
        'payment_due',
        title,
        message,
        debtId,
        'debt'
      );

      // Send email notification if debtor email is available
      if (debt.debtor_email) {
        await this.sendEmail(
          debt.debtor_email,
          'Payment Due Reminder',
          `Dear ${debt.debtor_name},\n\nThis is a reminder that your payment of Ksh ${debt.amount.toLocaleString()} is due on ${debt.due_date}.\n\nPlease contact us to arrange payment.\n\nBest regards,\nDebt Manager Pro`
        );
      }

      logger.info('Payment due notification sent', { debtId, userId });
    } catch (error) {
      logger.error('Failed to send payment due notification', { error: error.message, debtId, userId });
    }
  }

  // Payment overdue notification
  async notifyPaymentOverdue(debtId, userId) {
    try {
      const connection = await db;
      
      // Get debt details
      const [debts] = await connection.execute(
        'SELECT * FROM debts WHERE id = ? AND user_id = ?',
        [debtId, userId]
      );

      if (debts.length === 0) return;

      const debt = debts[0];
      const daysOverdue = Math.ceil((new Date() - new Date(debt.due_date)) / (1000 * 60 * 60 * 24));
      const title = 'Payment Overdue Alert';
      const message = `Payment of Ksh ${debt.amount.toLocaleString()} from ${debt.debtor_name} is ${daysOverdue} days overdue since ${debt.due_date}`;

      // Create notification
      await this.createNotification(
        userId,
        'payment_overdue',
        title,
        message,
        debtId,
        'debt'
      );

      // Send email notification if debtor email is available
      if (debt.debtor_email) {
        await this.sendEmail(
          debt.debtor_email,
          'Payment Overdue Alert',
          `Dear ${debt.debtor_name},\n\nURGENT: Your payment of Ksh ${debt.amount.toLocaleString()} is ${daysOverdue} days overdue.\n\nPlease contact us immediately to avoid further action.\n\nBest regards,\nDebt Manager Pro`
        );
      }

      logger.info('Payment overdue notification sent', { debtId, userId });
    } catch (error) {
      logger.error('Failed to send payment overdue notification', { error: error.message, debtId, userId });
    }
  }

  // Credit limit notification
  async notifyCreditLimit(creditId, userId, utilizationPercentage) {
    try {
      const connection = await db;
      
      // Get credit details
      const [credits] = await connection.execute(
        'SELECT * FROM credits WHERE id = ? AND user_id = ?',
        [creditId, userId]
      );

      if (credits.length === 0) return;

      const credit = credits[0];
      const title = 'Credit Limit Alert';
      const message = `Credit utilization for ${credit.creditor_name} is at ${utilizationPercentage}%`;

      // Create notification
      await this.createNotification(
        userId,
        'credit_limit',
        title,
        message,
        creditId,
        'credit'
      );

      logger.info('Credit limit notification sent', { creditId, userId, utilizationPercentage });
    } catch (error) {
      logger.error('Failed to send credit limit notification', { error: error.message, creditId, userId });
    }
  }

  // System notification
  async notifySystem(userId, title, message, relatedId = null, relatedType = null) {
    try {
      await this.createNotification(
        userId,
        'system',
        title,
        message,
        relatedId,
        relatedType
      );

      logger.info('System notification sent', { userId, title });
    } catch (error) {
      logger.error('Failed to send system notification', { error: error.message, userId, title });
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      const connection = await db;
      const [result] = await connection.execute(
        'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
        []
      );

      logger.info('Old notifications cleaned up', { deletedCount: result.affectedRows });
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
