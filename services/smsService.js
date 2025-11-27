// Custom SMS Service using our own SMS Gateway
const customSMSGateway = require('./customSMSGateway');

class SMSService {
  constructor() {
    this.gateway = customSMSGateway;
  }

  // Send SMS using custom gateway
  async sendSMS(to, message) {
    return await this.gateway.sendSMS(to, message);
  }

  // Send bulk SMS to multiple recipients
  async sendBulkSMS(recipients, message) {
    return await this.gateway.sendBulkSMS(recipients, message);
  }

  // Send payment reminder SMS
  async sendPaymentReminder(debtorName, amount, dueDate, phoneNumber) {
    return await this.gateway.sendPaymentReminder(debtorName, amount, dueDate, phoneNumber);
  }

  // Send overdue payment alert SMS
  async sendOverdueAlert(debtorName, amount, daysOverdue, phoneNumber) {
    return await this.gateway.sendOverdueAlert(debtorName, amount, daysOverdue, phoneNumber);
  }

  // Send payment confirmation SMS
  async sendPaymentConfirmation(debtorName, amount, phoneNumber) {
    return await this.gateway.sendPaymentConfirmation(debtorName, amount, phoneNumber);
  }

  // Get manual SMS queue
  async getManualQueue() {
    return await this.gateway.getManualQueue();
  }

  // Mark manual delivery
  async markManualDelivery(smsId, success = true) {
    return await this.gateway.markManualDelivery(smsId, success);
  }

  // Get delivery statistics
  async getDeliveryStats() {
    return await this.gateway.getDeliveryStats();
  }

  // Process retry queue
  async processRetries() {
    return await this.gateway.processRetries();
  }
}

const smsService = new SMSService();
module.exports = smsService;
