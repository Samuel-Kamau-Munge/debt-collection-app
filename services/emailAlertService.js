const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config/config');

class EmailAlertService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (config.email.smtp.auth.user && config.email.smtp.auth.pass) {
      this.transporter = nodemailer.createTransporter(config.email.smtp);
      logger.info('Email alert service initialized', { 
        host: config.email.smtp.host,
        user: config.email.smtp.auth.user 
      });
    } else {
      logger.warn('Email alert service not configured - missing SMTP credentials');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      logger.warn('Email transporter not available - email not sent', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: config.email.from,
        to: to,
        subject: subject,
        html: html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      return { success: false, error: error.message };
    }
  }

  htmlToText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Send transaction alert email
  async sendTransactionAlert(userId, transactionData) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.email) {
        logger.warn('User not found or no email address', { userId });
        return { success: false, error: 'User not found or no email address' };
      }

      const { type, amount, debtorName, creditorName, description } = transactionData;
      
      let subject, html;
      
      switch (type) {
        case 'payment_received':
          subject = `💰 Payment Received - Ksh ${amount.toLocaleString()}`;
          html = this.getPaymentReceivedTemplate(debtorName, amount, description);
          break;
        case 'payment_made':
          subject = `💸 Payment Made - Ksh ${amount.toLocaleString()}`;
          html = this.getPaymentMadeTemplate(creditorName, amount, description);
          break;
        case 'debt_created':
          subject = `📝 New Debt Recorded - Ksh ${amount.toLocaleString()}`;
          html = this.getDebtCreatedTemplate(debtorName, amount, description);
          break;
        case 'credit_created':
          subject = `💳 New Credit Recorded - Ksh ${amount.toLocaleString()}`;
          html = this.getCreditCreatedTemplate(creditorName, amount, description);
          break;
        default:
          subject = `📊 Transaction Update - Ksh ${amount.toLocaleString()}`;
          html = this.getGenericTransactionTemplate(type, amount, description);
      }

      const result = await this.sendEmail(user.email, subject, html);
      
      // Log the alert in notifications table
      if (result.success) {
        await this.createNotification(userId, 'system', subject, 
          `Email alert sent for ${type} transaction of Ksh ${amount.toLocaleString()}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to send transaction alert', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Send payment reminder email
  async sendPaymentReminderAlert(userId, debtData) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email address' };
      }

      const { debtorName, amount, dueDate, daysOverdue } = debtData;
      
      const subject = daysOverdue > 0 
        ? `⚠️ Overdue Payment Alert - ${debtorName}` 
        : `📅 Payment Reminder - ${debtorName}`;
      
      const html = daysOverdue > 0 
        ? this.getOverduePaymentTemplate(debtorName, amount, dueDate, daysOverdue)
        : this.getPaymentReminderTemplate(debtorName, amount, dueDate);

      const result = await this.sendEmail(user.email, subject, html);
      
      if (result.success) {
        await this.createNotification(userId, 'payment_overdue', subject, 
          `Email reminder sent for ${debtorName} - Ksh ${amount.toLocaleString()}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to send payment reminder alert', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Send credit limit alert
  async sendCreditLimitAlert(userId, creditData) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email address' };
      }

      const { creditorName, currentAmount, creditLimit, utilizationPercentage } = creditData;
      
      const subject = `🚨 Credit Limit Alert - ${creditorName}`;
      const html = this.getCreditLimitTemplate(creditorName, currentAmount, creditLimit, utilizationPercentage);

      const result = await this.sendEmail(user.email, subject, html);
      
      if (result.success) {
        await this.createNotification(userId, 'credit_limit', subject, 
          `Email alert sent for ${creditorName} credit limit - ${utilizationPercentage}% utilized`);
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to send credit limit alert', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Send bulk alerts to all users
  async sendBulkAlert(subject, message, alertType = 'system') {
    try {
      const users = await this.getAllUsers();
      const results = [];

      for (const user of users) {
        if (user.email) {
          const html = this.getBulkAlertTemplate(subject, message, user.first_name || user.username);
          const result = await this.sendEmail(user.email, subject, html);
          results.push({ userId: user.id, email: user.email, ...result });
          
          if (result.success) {
            await this.createNotification(user.id, alertType, subject, message);
          }
        }
      }

      logger.info('Bulk email alert sent', { 
        totalUsers: users.length, 
        emailsSent: results.filter(r => r.success).length 
      });
      
      return { success: true, results };
    } catch (error) {
      logger.error('Failed to send bulk alert', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Email templates
  getPaymentReceivedTemplate(debtorName, amount, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Received</title>
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
            <h1>💰 Payment Received</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Great news!</h2>
            <p>You have received a payment:</p>
            <ul>
              <li><strong>From:</strong> ${debtorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Description:</strong> ${description || 'Payment received'}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>This payment has been automatically recorded in your debt management system.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentMadeTemplate(creditorName, amount, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Made</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #e74c3c; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💸 Payment Made</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Payment Recorded</h2>
            <p>A payment has been made:</p>
            <ul>
              <li><strong>To:</strong> ${creditorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Description:</strong> ${description || 'Payment made'}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>This payment has been recorded in your credit management system.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDebtCreatedTemplate(debtorName, amount, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Debt Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #f39c12; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 New Debt Created</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Debt Record Added</h2>
            <p>A new debt has been recorded:</p>
            <ul>
              <li><strong>Debtor:</strong> ${debtorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Description:</strong> ${description || 'New debt recorded'}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>This debt has been added to your debt management system.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCreditCreatedTemplate(creditorName, amount, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Credit Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #3498db; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 New Credit Created</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Credit Record Added</h2>
            <p>A new credit has been recorded:</p>
            <ul>
              <li><strong>Creditor:</strong> ${creditorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Description:</strong> ${description || 'New credit recorded'}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>This credit has been added to your credit management system.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getOverduePaymentTemplate(debtorName, amount, dueDate, daysOverdue) {
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
            <h2>Urgent Notice</h2>
            <div class="urgent">
              <h3>OVERDUE PAYMENT</h3>
              <p>Payment from <strong>${debtorName}</strong> is <strong>${daysOverdue} days overdue</strong>.</p>
            </div>
            <ul>
              <li><strong>Debtor:</strong> ${debtorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
              <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
            </ul>
            <p><strong>Please take immediate action to collect this payment.</strong></p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentReminderTemplate(debtorName, amount, dueDate) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #f39c12; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Payment Reminder</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Payment Due Soon</h2>
            <p>A payment is due soon:</p>
            <ul>
              <li><strong>Debtor:</strong> ${debtorName}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
            </ul>
            <p>Please remind the debtor about this upcoming payment.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCreditLimitTemplate(creditorName, currentAmount, creditLimit, utilizationPercentage) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Credit Limit Alert</title>
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
            <h1>🚨 Credit Limit Alert</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Credit Limit Warning</h2>
            <div class="urgent">
              <h3>HIGH UTILIZATION</h3>
              <p>Credit limit for <strong>${creditorName}</strong> is <strong>${utilizationPercentage}% utilized</strong>.</p>
            </div>
            <ul>
              <li><strong>Creditor:</strong> ${creditorName}</li>
              <li><strong>Current Amount:</strong> <span class="amount">Ksh ${currentAmount.toLocaleString()}</span></li>
              <li><strong>Credit Limit:</strong> Ksh ${creditLimit.toLocaleString()}</li>
              <li><strong>Utilization:</strong> ${utilizationPercentage}%</li>
            </ul>
            <p><strong>Please review your credit usage to avoid exceeding the limit.</strong></p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getBulkAlertTemplate(subject, message, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 System Alert</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <h3>${subject}</h3>
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getGenericTransactionTemplate(type, amount, description) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transaction Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9b59b6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #9b59b6; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Transaction Update</h1>
            <p>Debt Manager Pro</p>
          </div>
          <div class="content">
            <h2>Transaction Recorded</h2>
            <p>A transaction has been updated:</p>
            <ul>
              <li><strong>Type:</strong> ${type.replace('_', ' ').toUpperCase()}</li>
              <li><strong>Amount:</strong> <span class="amount">Ksh ${amount.toLocaleString()}</span></li>
              <li><strong>Description:</strong> ${description || 'Transaction updated'}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>This transaction has been recorded in your system.</p>
          </div>
          <div class="footer">
            <p>Debt Manager Pro<br>
            Email: info@debtmanager.co.ke</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Database helper methods
  async getUserById(userId) {
    try {
      const connection = await db;
      const [users] = await connection.execute(
        'SELECT id, username, email, first_name, last_name FROM users WHERE id = ?',
        [userId]
      );
      return users[0] || null;
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error: error.message });
      return null;
    }
  }

  async getAllUsers() {
    try {
      const connection = await db;
      const [users] = await connection.execute(
        'SELECT id, username, email, first_name, last_name FROM users WHERE email IS NOT NULL'
      );
      return users;
    } catch (error) {
      logger.error('Failed to get all users', { error: error.message });
      return [];
    }
  }

  async createNotification(userId, type, title, message) {
    try {
      const notificationService = require('./notificationService');
      await notificationService.createNotification(
        userId,
        type,
        title,
        message,
        null,
        null,
        'medium'
      );
    } catch (err) {
      logger.error('Failed to create notification from email alert service', { error: err.message, userId, type });
      // Do not throw to avoid breaking email alert flow
    }
  }
}

const emailAlertService = new EmailAlertService();
module.exports = emailAlertService;




