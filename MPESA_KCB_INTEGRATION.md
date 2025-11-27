# M-Pesa and KCB Payment Integration

This document describes the integration of M-Pesa and KCB Mobile Banking as the only payment methods for the debt collection application.

## Overview

The application has been updated to support only two payment methods:
- **M-Pesa** - Mobile money payments via Safaricom's M-Pesa platform
- **KCB Mobile Banking** - Bank transfers via KCB's mobile banking platform

All other payment methods (cash, checks, bank transfers, etc.) have been removed from the system.

## Changes Made

### 1. Database Schema Updates

- Updated `transactions` table to only allow `mpesa` and `kcb` payment methods
- Created migration script to update existing payment methods

### 2. Backend Integration

#### M-Pesa Integration (`routes/mpesa.js`)
- STK Push implementation for initiating payments
- Payment status querying
- Callback handling for payment confirmations
- Development mode with sandbox credentials

#### KCB Integration (`routes/kcb.js`)
- Payment initiation API
- Payment status querying
- Callback handling
- Development mode with mock responses

#### Transaction Validation (`routes/transactions.js`)
- Updated to validate only M-Pesa and KCB payment methods
- Rejects any other payment methods with appropriate error messages

### 3. Frontend Updates

#### Payment Forms Updated:
- Debt Management > Receive Payment
- Transaction Management > Receive Payment
- Transaction Management > Make Payment
- Payment Schedule module

#### Payment Method Selection:
- Only M-Pesa and KCB options available
- Dynamic form fields based on selected payment method
- M-Pesa: Phone number field
- KCB: Phone number + Account number fields

## API Endpoints

### M-Pesa Endpoints
- `POST /api/mpesa/stk-push` - Initiate M-Pesa payment
- `POST /api/mpesa/stk-query` - Query payment status
- `POST /api/mpesa/callback` - Payment confirmation callback
- `POST /api/mpesa/timeout` - Payment timeout callback

### KCB Endpoints
- `POST /api/kcb/initiate-payment` - Initiate KCB payment
- `POST /api/kcb/query-payment` - Query payment status
- `POST /api/kcb/callback` - Payment confirmation callback
- `POST /api/kcb/timeout` - Payment timeout callback

## Configuration

### M-Pesa Configuration
Update the following in `routes/mpesa.js`:
```javascript
const MPESA_CONFIG = {
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  baseURL: 'https://sandbox.safaricom.co.ke', // or production URL
  shortCode: 'your_business_shortcode',
  passKey: 'your_passkey',
  callbackURL: 'https://your-domain.com/api/mpesa/callback',
  timeoutURL: 'https://your-domain.com/api/mpesa/timeout',
  isDevelopment: false // Set to false for production
};
```

### KCB Configuration
Update the following in `routes/kcb.js`:
```javascript
const KCB_CONFIG = {
  apiKey: 'your_kcb_api_key',
  apiSecret: 'your_kcb_api_secret',
  baseURL: 'https://api.kcbgroup.com',
  merchantId: 'your_merchant_id',
  terminalId: 'your_terminal_id',
  isDevelopment: false // Set to false for production
};
```

## Development Mode

Both integrations include development modes that provide mock responses for testing:

### M-Pesa Development Mode
- Uses sandbox credentials
- Provides mock checkout request IDs
- Simulates payment processing delays
- Uses test phone number: 254708374149

### KCB Development Mode
- Uses mock API responses
- Simulates payment processing
- Provides mock transaction references

## Migration

To update existing data, run the migration script:
```bash
node migrate-payment-methods.js
```

This will:
- Map existing payment methods to M-Pesa or KCB
- Update all transactions with the new payment method values
- Report the number of records updated

## Testing

Run the integration test suite:
```bash
node test-mpesa-kcb-integration.js
```

This will test:
- Database schema validation
- M-Pesa API integration
- KCB API integration
- Transaction validation
- Payment method restrictions

## Production Deployment

1. **Update Credentials**: Replace sandbox/mock credentials with production credentials
2. **Set Development Flags**: Set `isDevelopment: false` in both M-Pesa and KCB configurations
3. **Update Callback URLs**: Ensure callback URLs point to your production domain
4. **Run Migration**: Execute the payment method migration script
5. **Test Integration**: Verify both payment methods work correctly

## Security Considerations

- Store API credentials securely (use environment variables)
- Validate all incoming callback data
- Implement proper error handling and logging
- Use HTTPS for all callback URLs
- Implement rate limiting for payment endpoints

## Troubleshooting

### Common Issues

1. **Payment Method Validation Errors**
   - Ensure only `mpesa` or `kcb` values are used
   - Check transaction route validation

2. **M-Pesa Integration Issues**
   - Verify sandbox credentials are correct
   - Check callback URL accessibility
   - Ensure phone number format is correct (254XXXXXXXXX)

3. **KCB Integration Issues**
   - Verify API credentials
   - Check account number format
   - Ensure callback URL accessibility

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
```

This will provide detailed logs for:
- API request/response data
- Payment processing steps
- Error details

## Support

For issues related to:
- **M-Pesa Integration**: Contact Safaricom Developer Support
- **KCB Integration**: Contact KCB API Support
- **Application Issues**: Check application logs and error messages
