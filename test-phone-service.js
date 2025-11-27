#!/usr/bin/env node

/**
 * Phone Service Test Script
 * This script tests the phone service functionality
 */

const phoneService = require('./services/phoneService');

async function testPhoneService() {
  console.log('📞 Testing Phone Service');
  console.log('========================\n');

  // Test service status
  console.log('📊 Service Status:');
  const status = phoneService.getServiceStatus();
  console.log(JSON.stringify(status, null, 2));
  console.log('');

  // Test phone number
  const testPhone = '+254700000000';
  const testMessage = 'This is a test call from Debt Collection System to verify phone communication is working properly.';

  console.log('🧪 Testing Phone Call...');
  try {
    const callResult = await phoneService.makeCall(testPhone, testMessage);
    console.log('✅ Call Result:', JSON.stringify(callResult, null, 2));
  } catch (error) {
    console.log('❌ Call Error:', error.message);
  }

  console.log('\n🎤 Testing Voice Message...');
  try {
    const voiceResult = await phoneService.sendVoiceMessage(
      testPhone, 
      'This is a voice message test from Debt Collection System.',
      'alice',
      'en-US'
    );
    console.log('✅ Voice Message Result:', JSON.stringify(voiceResult, null, 2));
  } catch (error) {
    console.log('❌ Voice Message Error:', error.message);
  }

  console.log('\n🔍 Testing Call Status...');
  try {
    // Use a mock call SID for testing
    const mockCallSid = 'mock-call-' + Date.now();
    const statusResult = await phoneService.getCallStatus(mockCallSid);
    console.log('✅ Call Status Result:', JSON.stringify(statusResult, null, 2));
  } catch (error) {
    console.log('❌ Call Status Error:', error.message);
  }

  console.log('\n📋 Testing Call List...');
  try {
    const listResult = await phoneService.listCalls(5);
    console.log('✅ Call List Result:', JSON.stringify(listResult, null, 2));
  } catch (error) {
    console.log('❌ Call List Error:', error.message);
  }

  console.log('\n🧪 Testing Service Test...');
  try {
    const testResult = await phoneService.testService(testPhone, 'Service test message');
    console.log('✅ Service Test Result:', JSON.stringify(testResult, null, 2));
  } catch (error) {
    console.log('❌ Service Test Error:', error.message);
  }

  console.log('\n🎉 Phone service test completed!');
  console.log('\nTo test with real Twilio:');
  console.log('1. Run: node configure-phone-service.js');
  console.log('2. Configure your Twilio credentials');
  console.log('3. Restart the server');
  console.log('4. Run this test again');
}

testPhoneService().catch(console.error);

