const db = require('../config/database');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting notification scheduler...');

    // Run immediately
    this.checkOverduePayments();
    this.checkCreditLimits();

    // Then run every 15 minutes for more responsive notifications
    this.intervalId = setInterval(() => {
      this.checkOverduePayments();
      this.checkCreditLimits();
    }, 15 * 60 * 1000); // 15 minutes
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Notification scheduler stopped');
  }

  // Check for overdue payments and send notifications
  async checkOverduePayments() {
    try {
      logger.info('Checking for overdue payments...');
      
      const connection = await db;
      const today = new Date().toISOString().split('T')[0];
      
      // Find all active debts that are overdue
      const [overdueDebts] = await connection.execute(
        `SELECT d.*, u.email as user_email 
         FROM debts d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.status = 'active' 
         AND d.due_date < ? 
         AND d.due_date IS NOT NULL`,
        [today]
      );

      logger.info(`Found ${overdueDebts.length} overdue debts`);

      for (const debt of overdueDebts) {
        const daysOverdue = Math.ceil((new Date() - new Date(debt.due_date)) / (1000 * 60 * 60 * 24));
        
        // Determine notification frequency based on how overdue
        let shouldNotify = false;
        let notificationType = 'payment_overdue';
        
        if (daysOverdue === 1) {
          // First day overdue - notify once
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'debt' 
             AND type = 'payment_overdue' 
             AND DATE(created_at) = ?`,
            [debt.user_id, debt.id, today]
          );
          shouldNotify = existingNotification.length === 0;
        } else if (daysOverdue <= 7) {
          // 2-7 days overdue - notify every 2 days
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'debt' 
             AND type = 'payment_overdue' 
             AND DATE(created_at) >= DATE_SUB(?, INTERVAL 2 DAY)`,
            [debt.user_id, debt.id, today]
          );
          shouldNotify = existingNotification.length === 0;
        } else if (daysOverdue <= 30) {
          // 8-30 days overdue - notify every 3 days
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'debt' 
             AND type = 'payment_overdue' 
             AND DATE(created_at) >= DATE_SUB(?, INTERVAL 3 DAY)`,
            [debt.user_id, debt.id, today]
          );
          shouldNotify = existingNotification.length === 0;
        } else {
          // Over 30 days overdue - notify every week
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'debt' 
             AND type = 'payment_overdue' 
             AND DATE(created_at) >= DATE_SUB(?, INTERVAL 7 DAY)`,
            [debt.user_id, debt.id, today]
          );
          shouldNotify = existingNotification.length === 0;
          notificationType = 'payment_overdue';
        }

        if (shouldNotify) {
          // Send overdue notification with appropriate urgency
          await notificationService.createNotification(
            debt.user_id,
            notificationType,
            `Payment Overdue Alert - ${daysOverdue} days`,
            `Payment of Ksh ${parseFloat(debt.amount).toLocaleString()} from ${debt.debtor_name} is ${daysOverdue} days overdue since ${debt.due_date}. ${daysOverdue > 30 ? 'URGENT: Immediate action required!' : 'Please follow up immediately.'}`,
            debt.id,
            'debt',
            daysOverdue > 30 ? 'urgent' : daysOverdue > 7 ? 'high' : 'medium'
          );
          logger.info(`Overdue notification sent for debt ${debt.id} (${debt.debtor_name}) - ${daysOverdue} days overdue`);
        }
      }

      // Check for payments due today
      const [dueTodayDebts] = await connection.execute(
        `SELECT d.*, u.email as user_email 
         FROM debts d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.status = 'active' 
         AND d.due_date = ? 
         AND d.due_date IS NOT NULL`,
        [today]
      );

      logger.info(`Found ${dueTodayDebts.length} debts due today`);

      for (const debt of dueTodayDebts) {
        // Check if we already sent a due today notification
        const [existingNotification] = await connection.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? 
           AND related_id = ? 
           AND related_type = 'debt' 
           AND type = 'payment_due' 
           AND DATE(created_at) = ?`,
          [debt.user_id, debt.id, today]
        );

        if (existingNotification.length === 0) {
          // Send due today notification
          await notificationService.createNotification(
            debt.user_id,
            'payment_due',
            'Payment Due Today',
            `Payment of Ksh ${parseFloat(debt.amount).toLocaleString()} from ${debt.debtor_name} is due today. Please follow up immediately.`,
            debt.id,
            'debt',
            'high'
          );
          logger.info(`Due today notification sent for debt ${debt.id} (${debt.debtor_name})`);
        }
      }

      // Check for payments due tomorrow (reminder)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const [dueTomorrowDebts] = await connection.execute(
        `SELECT d.*, u.email as user_email 
         FROM debts d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.status = 'active' 
         AND d.due_date = ? 
         AND d.due_date IS NOT NULL`,
        [tomorrowStr]
      );

      logger.info(`Found ${dueTomorrowDebts.length} debts due tomorrow`);

      for (const debt of dueTomorrowDebts) {
        // Check if we already sent a due tomorrow notification
        const [existingNotification] = await connection.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? 
           AND related_id = ? 
           AND related_type = 'debt' 
           AND type = 'payment_due' 
           AND DATE(created_at) = ?`,
          [debt.user_id, debt.id, today]
        );

        if (existingNotification.length === 0) {
          // Send due tomorrow notification
          await notificationService.createNotification(
            debt.user_id,
            'payment_due',
            'Payment Due Tomorrow',
            `Payment of Ksh ${parseFloat(debt.amount).toLocaleString()} from ${debt.debtor_name} is due tomorrow. Consider sending a reminder.`,
            debt.id,
            'debt',
            'medium'
          );
          logger.info(`Due tomorrow notification sent for debt ${debt.id} (${debt.debtor_name})`);
        }
      }

    } catch (error) {
      logger.error('Error in notification scheduler:', error);
    }
  }

  // Check for credit limit alerts
  async checkCreditLimits() {
    try {
      logger.info('Checking credit limits...');
      
      const connection = await db;
      const today = new Date().toISOString().split('T')[0];
      
      // Find credits that are near or at their limit
      const [credits] = await connection.execute(
        `SELECT c.*, u.email as user_email 
         FROM credits c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.status = 'active' 
         AND c.credit_limit > 0`,
        []
      );

      for (const credit of credits) {
        const creditLimit = parseFloat(credit.credit_limit);
        const usedAmount = parseFloat(credit.amount || 0);
        const utilizationPercentage = (usedAmount / creditLimit) * 100;

        // Determine notification frequency based on utilization level
        let shouldNotify = false;
        let notificationType = 'credit_limit';
        let priority = 'medium';
        
        if (utilizationPercentage >= 90) {
          // Critical - notify every day
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'credit' 
             AND type = 'credit_limit' 
             AND DATE(created_at) = ?`,
            [credit.user_id, credit.id, today]
          );
          shouldNotify = existingNotification.length === 0;
          notificationType = 'credit_limit';
          priority = 'urgent';
        } else if (utilizationPercentage >= 80) {
          // High utilization - notify every 2 days
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'credit' 
             AND type = 'credit_limit' 
             AND DATE(created_at) >= DATE_SUB(?, INTERVAL 2 DAY)`,
            [credit.user_id, credit.id, today]
          );
          shouldNotify = existingNotification.length === 0;
          priority = 'high';
        } else if (utilizationPercentage >= 70) {
          // Moderate utilization - notify every 3 days
          const [existingNotification] = await connection.execute(
            `SELECT id FROM notifications 
             WHERE user_id = ? 
             AND related_id = ? 
             AND related_type = 'credit' 
             AND type = 'credit_limit' 
             AND DATE(created_at) >= DATE_SUB(?, INTERVAL 3 DAY)`,
            [credit.user_id, credit.id, today]
          );
          shouldNotify = existingNotification.length === 0;
          priority = 'medium';
        }

        if (shouldNotify) {
          // Create appropriate notification message
          let message = `Credit utilization for ${credit.creditor_name} is at ${utilizationPercentage.toFixed(1)}%`;
          let title = 'Credit Limit Alert';
          
          if (utilizationPercentage >= 90) {
            title = 'CRITICAL: Credit Limit Exceeded';
            message = `URGENT: Credit limit for ${credit.creditor_name} is at ${utilizationPercentage.toFixed(1)}%! Available credit: Ksh ${(creditLimit - usedAmount).toLocaleString()}`;
          } else if (utilizationPercentage >= 80) {
            title = 'High Credit Utilization';
            message = `Credit utilization for ${credit.creditor_name} is at ${utilizationPercentage.toFixed(1)}%. Available credit: Ksh ${(creditLimit - usedAmount).toLocaleString()}`;
          } else {
            title = 'Credit Utilization Warning';
            message = `Credit utilization for ${credit.creditor_name} is at ${utilizationPercentage.toFixed(1)}%. Consider reducing usage.`;
          }

          await notificationService.createNotification(
            credit.user_id,
            notificationType,
            title,
            message,
            credit.id,
            'credit',
            priority
          );
          logger.info(`Credit limit alert sent for credit ${credit.id} (${credit.creditor_name}) - ${utilizationPercentage.toFixed(1)}% utilized`);
        }
      }

    } catch (error) {
      logger.error('Error checking credit limits:', error);
    }
  }

  // Run all checks
  async runAllChecks() {
    await this.checkOverduePayments();
    await this.checkCreditLimits();
  }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;
