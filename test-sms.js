// Test SMS sending to a specific number
const smsService = require('./services/smsService');

async function testSMS() {
  const phoneNumber = '0112851330'; // The number you want to test
  const testMessage = 'This is a test SMS from Debt Manager Pro to verify SMS functionality is working.';

  console.log(`Sending test SMS to ${phoneNumber}...`);
  console.log(`Message: ${testMessage}`);

  try {
    const result = await smsService.sendSMS(phoneNumber, testMessage);

    console.log('SMS Send Result:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Method: ${result.method}`);

    if (result.success) {
      console.log('\n✅ SMS sent successfully!');
    } else {
      console.log('\n❌ SMS sending failed.');
      console.log(`Error: ${result.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
  }
}

// Run the test
testSMS();
