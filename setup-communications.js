#!/usr/bin/env node

/**
 * Communication Services Setup Script
 * This script helps configure email, SMS, and phone services for the debt management app
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Debt Manager Pro - Communication Services Setup');
console.log('================================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env file from template...');
  fs.copyFileSync(path.join(__dirname, 'env.example'), envPath);
  console.log('✅ .env file created successfully!\n');
}

// Function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to update .env file
function updateEnvFile(key, value) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if key exists
  const keyRegex = new RegExp(`^${key}=.*$`, 'm');
  if (keyRegex.test(envContent)) {
    // Update existing key
    envContent = envContent.replace(keyRegex, `${key}=${value}`);
  } else {
    // Add new key
    envContent += `\n${key}=${value}`;
  }
  
  fs.writeFileSync(envPath, envContent);
}

async function setupEmail() {
  console.log('📧 EMAIL CONFIGURATION');
  console.log('----------------------');
  console.log('For Gmail, you need to:');
  console.log('1. Enable 2-factor authentication');
  console.log('2. Generate an App Password (not your regular password)');
  console.log('3. Use the App Password below\n');

  const smtpUser = await askQuestion('Enter your email address: ');
  const smtpPass = await askQuestion('Enter your email password/app password: ');
  const smtpFrom = await askQuestion('Enter sender name (e.g., "Debt Manager Pro <noreply@yourdomain.com>"): ');

  if (smtpUser && smtpPass) {
    updateEnvFile('SMTP_USER', smtpUser);
    updateEnvFile('SMTP_PASS', smtpPass);
    if (smtpFrom) {
      updateEnvFile('SMTP_FROM', smtpFrom);
    }
    console.log('✅ Email configuration saved!\n');
  } else {
    console.log('⚠️  Email configuration skipped.\n');
  }
}

async function setupTwilio() {
  console.log('📱 TWILIO CONFIGURATION (SMS & Voice)');
  console.log('-------------------------------------');
  console.log('To get Twilio credentials:');
  console.log('1. Sign up at https://www.twilio.com');
  console.log('2. Get your Account SID and Auth Token from the console');
  console.log('3. Purchase a phone number for SMS and voice calls\n');

  const accountSid = await askQuestion('Enter your Twilio Account SID: ');
  const authToken = await askQuestion('Enter your Twilio Auth Token: ');
  const phoneNumber = await askQuestion('Enter your Twilio phone number (e.g., +254112851330): ');

  if (accountSid && authToken) {
    updateEnvFile('TWILIO_ACCOUNT_SID', accountSid);
    updateEnvFile('TWILIO_AUTH_TOKEN', authToken);
    if (phoneNumber) {
      updateEnvFile('TWILIO_PHONE_NUMBER', phoneNumber);
    }
    console.log('✅ Twilio configuration saved!\n');
  } else {
    console.log('⚠️  Twilio configuration skipped.\n');
  }
}

async function setupWebhook() {
  console.log('🔗 WEBHOOK CONFIGURATION');
  console.log('-------------------------');
  console.log('For phone call status updates, you need a public URL');
  console.log('You can use ngrok for local development or deploy to a server\n');

  const webhookUrl = await askQuestion('Enter your webhook URL (e.g., https://yourdomain.com or https://abc123.ngrok.io): ');

  if (webhookUrl) {
    updateEnvFile('WEBHOOK_URL', webhookUrl);
    console.log('✅ Webhook configuration saved!\n');
  } else {
    console.log('⚠️  Webhook configuration skipped.\n');
  }
}

async function main() {
  try {
    console.log('This setup will configure your communication services.\n');
    
    const setupEmailChoice = await askQuestion('Do you want to configure email? (y/n): ');
    if (setupEmailChoice.toLowerCase() === 'y') {
      await setupEmail();
    }

    const setupTwilioChoice = await askQuestion('Do you want to configure Twilio (SMS & Voice)? (y/n): ');
    if (setupTwilioChoice.toLowerCase() === 'y') {
      await setupTwilio();
    }

    const setupWebhookChoice = await askQuestion('Do you want to configure webhooks? (y/n): ');
    if (setupWebhookChoice.toLowerCase() === 'y') {
      await setupWebhook();
    }

    console.log('🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test the communication channels from the dashboard');
    console.log('3. Check the logs to ensure services are working properly\n');

    console.log('📋 Configuration Summary:');
    console.log('------------------------');
    
    // Read and display current config
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      if (line.includes('SMTP_USER') || line.includes('TWILIO_ACCOUNT_SID') || line.includes('WEBHOOK_URL')) {
        const [key, value] = line.split('=');
        if (value && value !== 'your_twilio_account_sid' && value !== 'your-email@gmail.com') {
          console.log(`✅ ${key}: ${value.substring(0, 8)}...`);
        } else {
          console.log(`❌ ${key}: Not configured`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

main();

