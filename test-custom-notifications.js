#!/usr/bin/env node

/**
 * Test Custom Notification Service
 * This script tests the custom notification service without external dependencies
 */

const customNotificationService = require('./services/customNotificationService');

async function testCustomNotifications() {
  console.log('🧪 Testing Custom Notification Service');
  console.log('=====================================\n');

  // Test recipient
  const testRecipient = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+254700000000'
  };

  console.log('📧 Testing Email Service...');
  try {
    const emailResult = await customNotificationService.sendEmail(
      testRecipient.email,
      'Test Email - Custom Service',
      '<h1>Test Email</h1><p>This is a test email from the custom notification service.</p>'
    );
    console.log('✅ Email Result:', emailResult);
  } catch (error) {
    console.log('❌ Email Error:', error.message);
  }

  console.log('\n📱 Testing SMS Service...');
  try {
    const smsResult = await customNotificationService.sendSMS(
      testRecipient.phone,
      'Test SMS from custom notification service'
    );
    console.log('✅ SMS Result:', smsResult);
  } catch (error) {
    console.log('❌ SMS Error:', error.message);
  }

  console.log('\n📞 Testing Phone Service...');
  try {
    const phoneResult = await customNotificationService.makeCall(
      testRecipient.phone,
      'Test call from custom notification service'
    );
    console.log('✅ Phone Result:', phoneResult);
  } catch (error) {
    console.log('❌ Phone Error:', error.message);
  }

  console.log('\n🔄 Testing Multi-Channel...');
  try {
    const multiResult = await customNotificationService.testChannels(testRecipient);
    console.log('✅ Multi-Channel Result:', multiResult);
  } catch (error) {
    console.log('❌ Multi-Channel Error:', error.message);
  }

  console.log('\n📊 Service Status:');
  const status = customNotificationService.getServiceStatus();
  console.log(JSON.stringify(status, null, 2));

  console.log('\n📈 Notification Statistics:');
  const stats = customNotificationService.getNotificationStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n🎉 Custom notification service test completed!');
}

testCustomNotifications().catch(console.error);

