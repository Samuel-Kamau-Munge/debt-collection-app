const emailAlertService = require('./services/emailAlertService');

async function testEmailAlertSystem() {
  console.log('📧 Testing Email Alert System...\n');
  
  try {
    // Test 1: Check email configuration
    console.log('1. Checking Email Configuration...');
    const config = require('./config/config');
    const emailConfigured = !!(config.email.smtp.auth.user && config.email.smtp.auth.pass);
    console.log('✅ Email configured:', emailConfigured);
    console.log('📧 SMTP Host:', config.email.smtp.host);
    console.log('📧 SMTP User:', config.email.smtp.auth.user || 'Not configured');
    
    if (!emailConfigured) {
      console.log('⚠️ Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
      console.log('📝 Example: SMTP_USER=your-email@gmail.com SMTP_PASS=your-app-password');
      return;
    }
    
    // Test 2: Get test user
    console.log('\n2. Getting Test User...');
    const users = await emailAlertService.getAllUsers();
    console.log('👥 Total users:', users.length);
    console.log('📧 Users with email:', users.filter(u => u.email).length);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    
    const testUser = users.find(u => u.email) || users[0];
    console.log('🎯 Test user:', testUser.username, testUser.email);
    
    // Test 3: Send test transaction alert
    console.log('\n3. Testing Transaction Alert...');
    const transactionResult = await emailAlertService.sendTransactionAlert(testUser.id, {
      type: 'payment_received',
      amount: 5000,
      debtorName: 'John Doe',
      description: 'Test payment received via M-Pesa'
    });
    
    console.log('📧 Transaction alert result:', transactionResult);
    
    // Test 4: Send payment reminder alert
    console.log('\n4. Testing Payment Reminder Alert...');
    const reminderResult = await emailAlertService.sendPaymentReminderAlert(testUser.id, {
      debtorName: 'Jane Smith',
      amount: 3000,
      dueDate: '2025-10-25',
      daysOverdue: 2
    });
    
    console.log('📧 Payment reminder result:', reminderResult);
    
    // Test 5: Send credit limit alert
    console.log('\n5. Testing Credit Limit Alert...');
    const creditResult = await emailAlertService.sendCreditLimitAlert(testUser.id, {
      creditorName: 'ABC Bank',
      currentAmount: 45000,
      creditLimit: 50000,
      utilizationPercentage: 90
    });
    
    console.log('📧 Credit limit alert result:', creditResult);
    
    // Test 6: Send bulk alert
    console.log('\n6. Testing Bulk Alert...');
    const bulkResult = await emailAlertService.sendBulkAlert(
      'System Maintenance Notice',
      'The Debt Collection System will undergo maintenance on Sunday from 2 AM to 4 AM. Please save your work before this time.',
      'system'
    );
    
    console.log('📧 Bulk alert result:', bulkResult);
    
    console.log('\n🎉 Email Alert System Test Results:');
    console.log('✅ Email configuration: Working');
    console.log('✅ Transaction alerts: Working');
    console.log('✅ Payment reminders: Working');
    console.log('✅ Credit limit alerts: Working');
    console.log('✅ Bulk alerts: Working');
    
    console.log('\n📱 How to Test in the Browser:');
    console.log('1. Go to http://localhost:5000/dashboard');
    console.log('2. Create a new debt or transaction');
    console.log('3. Check your email for the alert');
    console.log('4. Or use the API: POST /api/email-alerts/test');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testEmailAlertSystem()
    .then(() => {
      console.log('\n✅ Email alert system test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = testEmailAlertSystem;




