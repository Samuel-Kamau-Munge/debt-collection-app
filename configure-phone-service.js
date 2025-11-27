#!/usr/bin/env node

/**
 * Phone Service Configuration Script
 * This script helps configure the phone service for Debt Manager Pro
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function configurePhoneService() {
  console.log('📞 Phone Service Configuration');
  console.log('==============================\n');

  console.log('This will configure the phone service for Debt Manager Pro.');
  console.log('You can choose between mock mode (for testing) or real Twilio integration.\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    console.log('⚠️  No .env file found. Creating one from template...\n');
    if (fs.existsSync('env.example')) {
      envContent = fs.readFileSync('env.example', 'utf8');
    }
  }

  // Ask about phone service mode
  const useRealService = await question('Do you want to use real Twilio phone service? (y/n): ');
  
  if (useRealService.toLowerCase() === 'y') {
    console.log('\n🔧 TWILIO CONFIGURATION');
    console.log('------------------------');
    console.log('To get Twilio credentials:');
    console.log('1. Sign up at https://www.twilio.com');
    console.log('2. Get your Account SID and Auth Token from the console');
    console.log('3. Purchase a phone number for voice calls\n');

    const accountSid = await question('Enter your Twilio Account SID: ');
    const authToken = await question('Enter your Twilio Auth Token: ');
    const phoneNumber = await question('Enter your Twilio phone number (e.g., +1234567890): ');
    const webhookUrl = await question('Enter your webhook URL (for call status updates): ');

    // Update .env content
    envContent = updateEnvValue(envContent, 'TWILIO_ACCOUNT_SID', accountSid);
    envContent = updateEnvValue(envContent, 'TWILIO_AUTH_TOKEN', authToken);
    envContent = updateEnvValue(envContent, 'TWILIO_PHONE_NUMBER', phoneNumber);
    envContent = updateEnvValue(envContent, 'WEBHOOK_URL', webhookUrl);
    envContent = updateEnvValue(envContent, 'PHONE_SERVICE_ENABLED', 'true');
    envContent = updateEnvValue(envContent, 'PHONE_MOCK_MODE', 'false');

    console.log('\n✅ Twilio configuration saved!');
  } else {
    console.log('\n🎭 MOCK MODE CONFIGURATION');
    console.log('---------------------------');
    console.log('Phone service will run in mock mode for testing.\n');

    // Update .env content for mock mode
    envContent = updateEnvValue(envContent, 'PHONE_SERVICE_ENABLED', 'true');
    envContent = updateEnvValue(envContent, 'PHONE_MOCK_MODE', 'true');
    envContent = updateEnvValue(envContent, 'TWILIO_ACCOUNT_SID', '');
    envContent = updateEnvValue(envContent, 'TWILIO_AUTH_TOKEN', '');
    envContent = updateEnvValue(envContent, 'TWILIO_PHONE_NUMBER', '+254112851330');

    console.log('✅ Mock mode configuration saved!');
  }

  // Ask about additional phone settings
  console.log('\n⚙️  ADDITIONAL SETTINGS');
  console.log('------------------------');

  const defaultVoice = await question('Default voice (alice, man, woman) [alice]: ') || 'alice';
  const defaultLanguage = await question('Default language (en-US, en-GB, es-ES) [en-US]: ') || 'en-US';
  const maxDuration = await question('Max call duration in seconds [300]: ') || '300';
  const retryAttempts = await question('Retry attempts for failed calls [3]: ') || '3';

  // Update additional settings
  envContent = updateEnvValue(envContent, 'PHONE_DEFAULT_VOICE', defaultVoice);
  envContent = updateEnvValue(envContent, 'PHONE_DEFAULT_LANGUAGE', defaultLanguage);
  envContent = updateEnvValue(envContent, 'PHONE_MAX_DURATION', maxDuration);
  envContent = updateEnvValue(envContent, 'PHONE_RETRY_ATTEMPTS', retryAttempts);

  // Save .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n🎉 Phone service configuration completed!');
  console.log('\nConfiguration saved to .env file.');
  console.log('\nNext steps:');
  console.log('1. Restart your server: npm start');
  console.log('2. Test the phone service using the dashboard');
  console.log('3. Check logs for any issues');

  if (useRealService.toLowerCase() === 'y') {
    console.log('\n📋 Twilio Setup Checklist:');
    console.log('□ Account SID configured');
    console.log('□ Auth Token configured');
    console.log('□ Phone number purchased and configured');
    console.log('□ Webhook URL set up (for call status updates)');
    console.log('□ Test a call to verify everything works');
  } else {
    console.log('\n🎭 Mock Mode Features:');
    console.log('□ All phone calls will be simulated');
    console.log('□ No real calls will be made');
    console.log('□ Perfect for testing and development');
    console.log('□ Can be switched to real mode later');
  }

  rl.close();
}

function updateEnvValue(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (regex.test(content)) {
    return content.replace(regex, newLine);
  } else {
    return content + `\n${newLine}`;
  }
}

// Run the configuration
configurePhoneService().catch(console.error);

