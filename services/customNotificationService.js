const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class CustomNotificationService {
  constructor() {
    this.emailTransporter = null;
    this.notificationLog = [];
    this.initializeEmailTransporter();
    this.loadNotificationLog();
  }

  initializeEmailTransporter() {
    if (config.email.smtp.user && config.email.smtp.pass) {
      this.emailTransporter = nodemailer.createTransporter(config.email.smtp);
      logger.info('Custom email service initialized', { 
        host: config.email.smtp.host,
        user: config.email.smtp.auth.user 
      });
    } else {
      logger.warn('Email service not configured - using mock mode');
    }
  }

  // Create notification in database
  async createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
    try {
      const db = require('../config/database');
      const connection = await db;
      const [result] = await connection.execute(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userId, type, title, message, relatedId, relatedType]
      );

      logger.info('Notification created', {
        notificationId: result.insertId,
        userId,
        type,
        title
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create notification', { error: error.message, userId, type });
      throw error;
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    logger.warn('Email service disabled - skipping sendEmail');
    return { success: false, error: 'Email service disabled' };
  }

  // Mock email send for testing
  mockEmailSend(to, subject, html) {
    const mockResult = {
      success: true,
      messageId: 'mock-' + Date.now(),
      status: 'sent',
      mock: true
    };
    
    logger.info('Mock email sent', { to, subject, mock: true });
    this.logNotification('email', to, subject, 'sent (mock)');
    
    return mockResult;
  }

  // Send SMS notification (real implementation using Twilio)
  async sendSMS(to, message) {
    const smsService = require('./smsService');
    const result = await smsService.sendSms(to, message);
    if (result.success) {
      logger.info('SMS sent successfully', { to, messageId: result.sid });
      this.logNotification('sms', to, message, 'sent');
    } else {
      logger.error('Failed to send SMS', { to, error: result.error });
      this.logNotification('sms', to, message, 'failed', result.error);
    }
    return result;
  }

  // Make phone call (disabled)
  async makeCall(to, message) {
    logger.warn('Phone service disabled - skipping makeCall');
    return { success: false, error: 'Phone service disabled' };
  }

  // Send payment reminder
  async sendPaymentReminder(debtor, debt, channels = ['sms']) {
    const message = `Hi ${debtor.name}, this is a friendly reminder that you have a payment of Ksh ${debt.amount.toLocaleString()} due on ${debt.due_date}. Please contact us to arrange payment. Thank you!`;
    
    const results = {
      email: null,
      sms: null,
      phone: null
    };

    if (channels.includes('email') && debtor.email) {
      try {
        results.email = await this.sendEmail(
          debtor.email,
          'Payment Reminder - Debt Manager Pro',
          this.generatePaymentReminderHTML(debtor, debt)
        );
      } catch (error) {
        logger.error('Failed to send payment reminder email', { error: error.message });
        results.email = { success: false, error: error.message };
      }
    }

    if (channels.includes('sms') && debtor.phone) {
      try {
        results.sms = await this.sendSMS(debtor.phone, message);
      } catch (error) {
        logger.error('Failed to send payment reminder SMS', { error: error.message });
        results.sms = { success: false, error: error.message };
      }
    }

    if (channels.includes('phone') && debtor.phone) {
      try {
        results.phone = await this.makeCall(debtor.phone, message);
      } catch (error) {
        logger.error('Failed to make payment reminder call', { error: error.message });
        results.phone = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Send overdue alert
  async sendOverdueAlert(debtor, debt, channels = ['sms']) {
    const daysOverdue = Math.ceil((new Date() - new Date(debt.due_date)) / (1000 * 60 * 60 * 24));
    const message = `URGENT: Hi ${debtor.name}, your payment of Ksh ${debt.amount.toLocaleString()} is ${daysOverdue} days overdue. Please contact us immediately to avoid further action.`;
    
    const results = {
      email: null,
      sms: null,
      phone: null
    };

    if (channels.includes('email') && debtor.email) {
      try {
        results.email = await this.sendEmail(
          debtor.email,
          'URGENT: Overdue Payment Alert - Debt Manager Pro',
          this.generateOverdueAlertHTML(debtor, debt, daysOverdue)
        );
      } catch (error) {
        logger.error('Failed to send overdue alert email', { error: error.message });
        results.email = { success: false, error: error.message };
      }
    }

    if (channels.includes('sms') && debtor.phone) {
      try {
        results.sms = await this.sendSMS(debtor.phone, message);
      } catch (error) {
        logger.error('Failed to send overdue alert SMS', { error: error.message });
        results.sms = { success: false, error: error.message };
      }
    }

    if (channels.includes('phone') && debtor.phone) {
      try {
        results.phone = await this.makeCall(debtor.phone, message);
      } catch (error) {
        logger.error('Failed to make overdue alert call', { error: error.message });
        results.phone = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Send payment confirmation
  async sendPaymentConfirmation(debtor, amount, channels = ['sms']) {
    const message = `Thank you ${debtor.name}! We have received your payment of Ksh ${amount.toLocaleString()}. Your account is now up to date.`;
    
    const results = {
      email: null,
      sms: null,
      phone: null
    };

    if (channels.includes('email') && debtor.email) {
      try {
        results.email = await this.sendEmail(
          debtor.email,
          'Payment Confirmation - Debt Manager Pro',
          this.generatePaymentConfirmationHTML(debtor, amount)
        );
      } catch (error) {
        logger.error('Failed to send payment confirmation email', { error: error.message });
        results.email = { success: false, error: error.message };
      }
    }

    if (channels.includes('sms') && debtor.phone) {
      try {
        results.sms = await this.sendSMS(debtor.phone, message);
      } catch (error) {
        logger.error('Failed to send payment confirmation SMS', { error: error.message });
        results.sms = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Send bulk notifications
  async sendBulkNotifications(recipients, message, title, channels = ['sms']) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = {
        recipient: recipient.name || recipient.email || recipient.phone,
        email: null,
        sms: null,
        phone: null
      };

      if (channels.includes('email') && recipient.email) {
        try {
          result.email = await this.sendEmail(recipient.email, title, `<p>${message}</p>`);
        } catch (error) {
          result.email = { success: false, error: error.message };
        }
      }

      if (channels.includes('sms') && recipient.phone) {
        try {
          result.sms = await this.sendSMS(recipient.phone, message);
        } catch (error) {
          result.sms = { success: false, error: error.message };
        }
      }

      if (channels.includes('phone') && recipient.phone) {
        try {
          result.phone = await this.makeCall(recipient.phone, message);
        } catch (error) {
          result.phone = { success: false, error: error.message };
        }
      }

      results.push(result);
      
      // Add delay between messages to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  // Test all channels
  async testChannels(testRecipient) {
    const results = {
      email: null,
      sms: null,
      phone: null
    };

    const testMessage = 'This is a test message from Debt Manager Pro to verify communication channels are working.';

    // Test email
    if (testRecipient.email) {
      try {
        results.email = await this.sendEmail(
          testRecipient.email,
          'Test Email - Debt Manager Pro',
          `<h1>Test Email</h1><p>${testMessage}</p>`
        );
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }

    // Test SMS
    if (testRecipient.phone) {
      try {
        results.sms = await this.sendSMS(testRecipient.phone, testMessage);
      } catch (error) {
        results.sms = { success: false, error: error.message };
      }
    }

    // Test phone
    if (testRecipient.phone) {
      try {
        results.phone = await this.makeCall(testRecipient.phone, testMessage);
      } catch (error) {
        results.phone = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Generate HTML templates
  generatePaymentReminderHTML(debtor, debt) {
    return `
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
            <h2>Hello ${debtor.name},</h2>
            <p>This is a friendly reminder that you have a payment due:</p>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${debt.amount.toLocaleString()}</span></li>
              <li><strong>Due Date:</strong> ${debt.due_date}</li>
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
  }

  generateOverdueAlertHTML(debtor, debt, daysOverdue) {
    return `
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
            <h2>Hello ${debtor.name},</h2>
            <div class="urgent">
              <h3>URGENT NOTICE</h3>
              <p>Your payment is now <strong>${daysOverdue} days overdue</strong>.</p>
            </div>
            <ul>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${debt.amount.toLocaleString()}</span></li>
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
  }

  generatePaymentConfirmationHTML(debtor, amount) {
    return `
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
            <h2>Thank you, ${debtor.name}!</h2>
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
  }

  // Log notifications for tracking
  logNotification(type, recipient, message, status, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      recipient,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      status,
      error
    };
    
    this.notificationLog.push(logEntry);
    this.saveNotificationLog();
  }

  // Save notification log to file
  saveNotificationLog() {
    try {
      const logPath = path.join(__dirname, '../logs/notifications.json');
      fs.writeFileSync(logPath, JSON.stringify(this.notificationLog, null, 2));
    } catch (error) {
      logger.error('Failed to save notification log', { error: error.message });
    }
  }

  // Load notification log from file
  loadNotificationLog() {
    try {
      const logPath = path.join(__dirname, '../logs/notifications.json');
      if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, 'utf8');
        this.notificationLog = JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to load notification log', { error: error.message });
      this.notificationLog = [];
    }
  }

  // Get notification statistics
  getNotificationStats() {
    const stats = {
      total: this.notificationLog.length,
      byType: {},
      byStatus: {},
      recent: this.notificationLog.slice(-10)
    };

    this.notificationLog.forEach(entry => {
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
    });

    return stats;
  }

  // Get service status
  getServiceStatus() {
    return {
      email: {
        configured: false,
        status: 'disabled'
      },
      sms: {
        configured: true,
        status: 'active'
      },
      phone: {
        configured: false,
        status: 'disabled'
      }
    };
  }
}

// Create singleton instance
const customNotificationService = new CustomNotificationService();

module.exports = customNotificationService;

