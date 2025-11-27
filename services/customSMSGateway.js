// Custom SMS Gateway - No third-party dependencies
const fs = require('fs');
const path = require('path');
const { SerialPort } = require('serialport');
const logger = require('../utils/logger');

class CustomSMSGateway {
  constructor() {
    this.fromNumber = '+254112851330';
    this.smsQueuePath = path.join(__dirname, '../data/sms-queue.json');
    this.deliveryLogPath = path.join(__dirname, '../logs/sms-delivery.log');
    this.gsmModem = null;
    this.smsQueue = [];

    this.initializeDirectories();
    this.initializeGSMModem();
    this.loadSMSQueue();
  }

  initializeDirectories() {
    const dirs = ['../data', '../logs'];
    dirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  initializeGSMModem() {
    const modemConfig = {
      path: process.env.GSM_MODEM_PORT || 'COM3',
      baudRate: parseInt(process.env.GSM_MODEM_BAUD) || 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      flowControl: false
    };

    try {
      this.gsmModem = new SerialPort(modemConfig);

      this.gsmModem.on('open', () => {
        logger.info('GSM modem connected successfully');
        this.initializeModem();
      });

      this.gsmModem.on('error', (error) => {
        logger.error('GSM modem error', { error: error.message });
        this.gsmModem = null;
      });

    } catch (error) {
      logger.warn('GSM modem not available, using file-based delivery', { error: error.message });
      this.gsmModem = null;
    }
  }

  async initializeModem() {
    if (!this.gsmModem) return;

    try {
      await this.sendATCommand('AT');
      await this.sendATCommand('AT+CMGF=1');
      await this.sendATCommand('AT+CNMI=1,2,0,0,0');

      logger.info('GSM modem initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GSM modem', { error: error.message });
    }
  }

  sendATCommand(command, timeout = 2000) {
    return new Promise((resolve, reject) => {
      if (!this.gsmModem) {
        reject(new Error('Modem not available'));
        return;
      }

      const commandWithCR = command + '\r';
      let response = '';

      const onData = (data) => {
        response += data.toString();

        if (response.includes('OK') || response.includes('ERROR')) {
          this.gsmModem.removeListener('data', onData);
          clearTimeout(timeoutId);

          if (response.includes('OK')) {
            resolve(response.trim());
          } else {
            reject(new Error(`AT command failed: ${response.trim()}`));
          }
        }
      };

      this.gsmModem.on('data', onData);

      const timeoutId = setTimeout(() => {
        this.gsmModem.removeListener('data', onData);
        reject(new Error(`AT command timeout: ${command}`));
      }, timeout);

      this.gsmModem.write(commandWithCR);
    });
  }

  async sendSMS(to, message) {
    const smsId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const formattedNumber = this.formatPhoneNumber(to);

    const smsData = {
      id: smsId,
      to: formattedNumber,
      message: message,
      timestamp: new Date().toISOString(),
      status: 'queued',
      deliveryMethod: this.gsmModem ? 'gsm_modem' : 'manual',
      attempts: 0
    };

    this.smsQueue.push(smsData);
    await this.saveSMSQueue();

    const result = await this.attemptDelivery(smsData);
    await this.logDeliveryAttempt(smsData, result);

    return {
      success: result.success,
      messageId: smsId,
      status: result.status,
      method: smsData.deliveryMethod
    };
  }

  async attemptDelivery(smsData) {
    smsData.attempts += 1;
    smsData.lastAttempt = new Date().toISOString();

    try {
      if (this.gsmModem) {
        return await this.deliverViaGSMModem(smsData);
      } else {
        return await this.queueForManualDelivery(smsData);
      }
    } catch (error) {
      logger.error('SMS delivery failed', {
        smsId: smsData.id,
        error: error.message,
        attempts: smsData.attempts
      });

      return {
        success: false,
        status: 'failed',
        error: error.message
      };
    }
  }

  async deliverViaGSMModem(smsData) {
    try {
      await this.sendATCommand('AT+CMGS="' + smsData.to + '"');
      await this.sendATCommand(smsData.message + '\x1A');

      smsData.status = 'sent';
      await this.saveSMSQueue();

      return {
        success: true,
        status: 'sent',
        method: 'gsm_modem'
      };
    } catch (error) {
      smsData.status = 'failed';
      await this.saveSMSQueue();

      throw error;
    }
  }

  async queueForManualDelivery(smsData) {
    const manualQueuePath = path.join(__dirname, '../data/manual-sms-queue.json');

    try {
      let manualQueue = [];
      if (fs.existsSync(manualQueuePath)) {
        manualQueue = JSON.parse(fs.readFileSync(manualQueuePath, 'utf8'));
      }

      manualQueue.push({
        ...smsData,
        instructions: 'Use web interface or GSM modem to send this SMS manually'
      });

      fs.writeFileSync(manualQueuePath, JSON.stringify(manualQueue, null, 2));

      return {
        success: true,
        status: 'queued_manual',
        method: 'manual'
      };
    } catch (error) {
      throw new Error('Failed to queue for manual delivery');
    }
  }

  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '+254' + cleaned;
    } else if (cleaned.startsWith('254') && !cleaned.startsWith('+254')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  async logDeliveryAttempt(smsData, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      smsId: smsData.id,
      to: smsData.to,
      messageLength: smsData.message.length,
      attempts: smsData.attempts,
      method: smsData.deliveryMethod,
      success: result.success,
      status: result.status,
      error: result.error || null
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.promises.appendFile(this.deliveryLogPath, logLine, 'utf8');
  }

  loadSMSQueue() {
    try {
      if (fs.existsSync(this.smsQueuePath)) {
        this.smsQueue = JSON.parse(fs.readFileSync(this.smsQueuePath, 'utf8'));
      } else {
        this.smsQueue = [];
      }
    } catch (error) {
      logger.error('Failed to load SMS queue', { error: error.message });
      this.smsQueue = [];
    }
  }

  async saveSMSQueue() {
    try {
      fs.writeFileSync(this.smsQueuePath, JSON.stringify(this.smsQueue, null, 2));
    } catch (error) {
      logger.error('Failed to save SMS queue', { error: error.message });
    }
  }

  async getManualQueue() {
    const manualQueuePath = path.join(__dirname, '../data/manual-sms-queue.json');

    try {
      if (fs.existsSync(manualQueuePath)) {
        return JSON.parse(fs.readFileSync(manualQueuePath, 'utf8'));
      }
      return [];
    } catch (error) {
      logger.error('Failed to load manual queue', { error: error.message });
      return [];
    }
  }

  async markManualDelivery(smsId, success = true) {
    const manualQueuePath = path.join(__dirname, '../data/manual-sms-queue.json');

    try {
      let manualQueue = [];
      if (fs.existsSync(manualQueuePath)) {
        manualQueue = JSON.parse(fs.readFileSync(manualQueuePath, 'utf8'));
      }

      const smsIndex = manualQueue.findIndex(sms => sms.id === smsId);
      if (smsIndex !== -1) {
        manualQueue[smsIndex].status = success ? 'delivered_manually' : 'failed_manual';
        manualQueue[smsIndex].deliveredAt = new Date().toISOString();

        fs.writeFileSync(manualQueuePath, JSON.stringify(manualQueue, null, 2));

        const mainSms = this.smsQueue.find(sms => sms.id === smsId);
        if (mainSms) {
          mainSms.status = success ? 'delivered_manually' : 'failed_manual';
          await this.saveSMSQueue();
        }

        return { success: true };
      }

      return { success: false, error: 'SMS not found in manual queue' };
    } catch (error) {
      logger.error('Failed to mark manual delivery', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async getDeliveryStats() {
    try {
      const stats = {
        totalQueued: this.smsQueue.length,
        sent: this.smsQueue.filter(sms => sms.status === 'sent').length,
        failed: this.smsQueue.filter(sms => sms.status === 'failed').length,
        manual: this.smsQueue.filter(sms => sms.status.includes('manual')).length,
        modemAvailable: this.gsmModem !== null,
        recentDeliveries: this.smsQueue.slice(-5)
      };

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }

  async processRetries() {
    const retryCandidates = this.smsQueue.filter(sms =>
      sms.status === 'failed' && sms.attempts < 3
    );

    for (const sms of retryCandidates) {
      logger.info('Retrying SMS delivery', { smsId: sms.id, attempts: sms.attempts });
      await this.attemptDelivery(sms);
    }
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, message) {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient, message);
      results.push({
        recipient,
        ...result
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  // Send payment reminder
  async sendPaymentReminder(debtorName, amount, dueDate, phoneNumber) {
    const message = `Hi ${debtorName}, this is a friendly reminder that you have a payment of Ksh ${amount.toLocaleString()} due on ${dueDate}. Please contact us at ${this.fromNumber} to arrange payment. Thank you!`;

    return await this.sendSMS(phoneNumber, message);
  }

  // Send overdue alert
  async sendOverdueAlert(debtorName, amount, daysOverdue, phoneNumber) {
    const message = `URGENT: Hi ${debtorName}, your payment of Ksh ${amount.toLocaleString()} is ${daysOverdue} days overdue. Please contact us immediately at ${this.fromNumber} to avoid further action.`;

    return await this.sendSMS(phoneNumber, message);
  }

  // Send payment confirmation
  async sendPaymentConfirmation(debtorName, amount, phoneNumber) {
    const message = `Thank you ${debtorName}! We have received your payment of Ksh ${amount.toLocaleString()}. Your account is now up to date.`;

    return await this.sendSMS(phoneNumber, message);
  }
}

const customSMSGateway = new CustomSMSGateway();
module.exports = customSMSGateway;
