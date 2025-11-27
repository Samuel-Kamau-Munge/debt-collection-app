# Phone Service Setup Guide

## Overview

The phone service has been successfully configured for your Debt Manager Pro application. It provides both mock mode (for testing) and real Twilio integration for making actual phone calls.

## Current Status

✅ **Phone Service**: Configured and working in mock mode  
✅ **API Endpoints**: Available at `/api/phone/*`  
✅ **Webhook Support**: Ready for call status updates  
✅ **Mock Mode**: Fully functional for testing  

## Features

### 📞 **Phone Call Capabilities**
- Make voice calls to debtors
- Custom voice selection (alice, man, woman)
- Multiple language support
- Call status tracking
- Webhook integration for real-time updates

### 🎤 **Voice Message Features**
- Pre-recorded voice messages
- Customizable voice and language
- Professional call flow
- Automatic call termination

### 🔧 **Service Management**
- Service status monitoring
- Call history tracking
- Error handling and retries
- Mock mode for development

## API Endpoints

### Make a Phone Call
```http
POST /api/phone/call
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "to": "+254700000000",
  "message": "Your payment is overdue. Please contact us immediately.",
  "options": {
    "statusCallback": "https://your-domain.com/webhook/call-status"
  }
}
```

### Send Voice Message
```http
POST /api/phone/voice-message
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "to": "+254700000000",
  "message": "Thank you for your payment. Your account is now up to date.",
  "voice": "alice",
  "language": "en-US"
}
```

### Get Call Status
```http
GET /api/phone/call/{callSid}/status
Authorization: Bearer <your-token>
```

### List Recent Calls
```http
GET /api/phone/calls?limit=20
Authorization: Bearer <your-token>
```

### Test Phone Service
```http
POST /api/phone/test
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "phone": "+254700000000",
  "message": "Test call message"
}
```

### Get Service Status
```http
GET /api/phone/status
Authorization: Bearer <your-token>
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Phone Service Configuration
PHONE_SERVICE_ENABLED=true
PHONE_MOCK_MODE=true
PHONE_DEFAULT_VOICE=alice
PHONE_DEFAULT_LANGUAGE=en-US
PHONE_MAX_DURATION=300
PHONE_RETRY_ATTEMPTS=3

# Twilio Configuration (for real calls)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+254112851330
WEBHOOK_URL=https://your-domain.com/webhook
```

### Quick Configuration

Run the configuration script:
```bash
node configure-phone-service.js
```

This will guide you through setting up either mock mode or real Twilio integration.

## Testing

### Command Line Test
```bash
node test-phone-service.js
```

### Web Interface Test
1. Go to Communication Management in the dashboard
2. Click "Test Channels"
3. Enter a test phone number
4. Click "Test Phone Only"

### API Test
```bash
curl -X POST http://localhost:5000/api/phone/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+254700000000", "message": "Test call"}'
```

## Mock Mode vs Real Mode

### Mock Mode (Current)
- ✅ **No external dependencies**
- ✅ **Always works**
- ✅ **Perfect for testing**
- ✅ **No costs**
- ❌ **No real calls made**

### Real Mode (Twilio)
- ✅ **Makes actual phone calls**
- ✅ **Professional call quality**
- ✅ **Real-time status updates**
- ✅ **Call recording capabilities**
- ❌ **Requires Twilio account**
- ❌ **Costs per call**

## Webhook Integration

### Call Status Webhook
The service supports webhooks for real-time call status updates:

```http
POST /api/phone/webhook/call-status
Content-Type: application/x-www-form-urlencoded

CallSid=CA1234567890&CallStatus=completed&From=%2B1234567890&To=%2B0987654321&Duration=45
```

### Twilio Webhook
For Twilio-specific webhooks:

```http
POST /api/phone/webhook/twilio
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: <signature>

<twilio-webhook-data>
```

## Usage Examples

### In Your Application Code

```javascript
const phoneService = require('./services/phoneService');

// Make a call
const result = await phoneService.makeCall(
  '+254700000000',
  'Your payment is overdue. Please contact us immediately.'
);

// Send voice message
const voiceResult = await phoneService.sendVoiceMessage(
  '+254700000000',
  'Thank you for your payment.',
  'alice',
  'en-US'
);

// Check call status
const status = await phoneService.getCallStatus(result.callSid);
```

### In Dashboard JavaScript

```javascript
// Test phone service
async function testPhone() {
  const response = await fetch('/api/phone/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: '+254700000000',
      message: 'Test call from dashboard'
    })
  });
  
  const result = await response.json();
  console.log('Phone test result:', result);
}
```

## Error Handling

The service includes comprehensive error handling:

- **Network errors**: Automatic retry with exponential backoff
- **Invalid numbers**: Proper validation and error messages
- **Service unavailable**: Graceful fallback to mock mode
- **Rate limiting**: Built-in rate limiting and queuing

## Monitoring and Logging

### Logs
All phone service activities are logged to:
- Console output
- Application logs (`logs/app.log`)
- Call-specific logs with call SIDs

### Metrics
Track phone service performance:
- Call success rate
- Average call duration
- Error rates
- Mock vs real call usage

## Troubleshooting

### Common Issues

1. **"Phone service not configured"**
   - Check if `PHONE_SERVICE_ENABLED=true` in `.env`
   - Restart the server after configuration changes

2. **"Mock phone call made"**
   - This is normal in mock mode
   - To use real calls, configure Twilio credentials

3. **"Failed to make phone call"**
   - Check Twilio credentials
   - Verify phone number format
   - Check network connectivity

### Debug Mode

Enable debug logging:
```env
DEBUG=phone-service
NODE_ENV=development
```

## Next Steps

1. **Test the Service**: Use the web interface to test phone calls
2. **Configure Twilio** (Optional): Set up real phone calls
3. **Monitor Usage**: Check logs and metrics
4. **Customize Messages**: Modify call scripts and voice settings
5. **Set Up Webhooks**: Configure call status monitoring

## Support

For issues or questions:
1. Check the logs in `logs/app.log`
2. Run the test script: `node test-phone-service.js`
3. Verify configuration: `node configure-phone-service.js`
4. Check API endpoints with the web interface

The phone service is now fully configured and ready to use! 🎉

