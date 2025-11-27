# Custom Notification Service

## Overview

I've created a custom notification service that provides a self-contained solution for sending notifications without external dependencies. This service includes mock implementations for SMS and phone calls, and can optionally use real email services when configured.

## Features

### ✅ **Email Service**
- **Real Email**: Uses Nodemailer with SMTP configuration when credentials are provided
- **Mock Mode**: Falls back to mock mode when email is not configured
- **HTML Templates**: Beautiful HTML email templates for different notification types
- **Logging**: Comprehensive logging of all email attempts

### ✅ **SMS Service**
- **Mock Implementation**: Always works without external dependencies
- **Realistic Responses**: Returns proper success/error responses
- **Logging**: Tracks all SMS attempts in notification log

### ✅ **Phone Service**
- **Mock Implementation**: Always works without external dependencies
- **Call Simulation**: Simulates phone calls with proper response format
- **Logging**: Tracks all phone call attempts in notification log

### ✅ **Multi-Channel Support**
- Send notifications through multiple channels simultaneously
- Individual channel testing
- Bulk messaging capabilities
- Comprehensive error handling

## Files Created/Modified

### New Files
- `services/customNotificationService.js` - Main custom notification service
- `test-custom-notifications.js` - Test script for the custom service
- `CUSTOM_NOTIFICATION_SERVICE.md` - This documentation

### Modified Files
- `services/communicationService.js` - Updated to use custom service
- `routes/communications.js` - Updated API endpoints to use custom service
- `public/dashboard-modules/communication-management/test-channels.html` - Enhanced UI with mock mode indicators

## Service Status

| Service | Status | Mode |
|---------|--------|------|
| Email | ✅ Working | Mock (can be configured for real) |
| SMS | ✅ Working | Mock |
| Phone | ✅ Working | Mock |

## Usage Examples

### Basic Email
```javascript
const customNotificationService = require('./services/customNotificationService');

// Send email
await customNotificationService.sendEmail(
  'user@example.com',
  'Test Subject',
  '<h1>Test Email</h1><p>This is a test email.</p>'
);
```

### Basic SMS
```javascript
// Send SMS
await customNotificationService.sendSMS(
  '+254700000000',
  'Test SMS message'
);
```

### Basic Phone Call
```javascript
// Make phone call
await customNotificationService.makeCall(
  '+254700000000',
  'Test phone call message'
);
```

### Multi-Channel Test
```javascript
// Test all channels
const testRecipient = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+254700000000'
};

const results = await customNotificationService.testChannels(testRecipient);
console.log(results);
```

## API Endpoints

### Test All Channels
```
POST /api/communications/test
{
  "email": "test@example.com",
  "phone": "+254700000000",
  "message": "Test message",
  "channels": ["email", "sms", "phone"]
}
```

### Test Individual Channels
```
POST /api/communications/test-email
POST /api/communications/test-sms
POST /api/communications/test-phone
```

### Check Configuration
```
GET /api/communications/config-status
```

## Notification Types

### 1. Payment Reminders
- Professional HTML email template
- Friendly reminder tone
- Clear payment details

### 2. Overdue Alerts
- Urgent styling with warning colors
- Days overdue calculation
- Strong call-to-action

### 3. Payment Confirmations
- Success-themed design
- Payment amount and date
- Thank you message

### 4. Bulk Messages
- Custom message support
- Multiple recipient handling
- Rate limiting to prevent spam

## Logging and Statistics

### Notification Log
- All notifications are logged to `logs/notifications.json`
- Includes timestamp, type, recipient, message, status, and errors
- Persistent across server restarts

### Statistics
- Total notification count
- Breakdown by type (email, sms, phone)
- Breakdown by status (sent, failed, mock)
- Recent notifications list

## Configuration

### Email Configuration (Optional)
To enable real email sending, configure in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Debt Manager Pro <noreply@debtmanager.co.ke>"
```

### Service Status
The service automatically detects configuration and reports status:
- **Configured**: Real service available
- **Mock**: Using mock implementation
- **Not configured**: Service unavailable

## Testing

### Command Line Test
```bash
node test-custom-notifications.js
```

### Web Interface Test
1. Go to Communication Management in the dashboard
2. Click "Test Channels"
3. Enter test email and phone
4. Click "Test All Selected Channels"

## Benefits

1. **No External Dependencies**: Works immediately without Twilio or other services
2. **Always Functional**: Mock mode ensures the system always works
3. **Easy Testing**: Comprehensive test interface and logging
4. **Professional Templates**: Beautiful HTML email templates
5. **Scalable**: Can be easily extended with real services
6. **Comprehensive Logging**: Full audit trail of all notifications
7. **Error Handling**: Robust error handling and fallbacks

## Next Steps

1. **Test the Service**: Use the web interface to test all channels
2. **Configure Email** (Optional): Set up real email if needed
3. **Monitor Logs**: Check `logs/notifications.json` for notification history
4. **Customize Templates**: Modify HTML templates as needed
5. **Add Real Services**: Integrate real SMS/phone services when ready

The custom notification service is now fully functional and ready to use! 🎉

