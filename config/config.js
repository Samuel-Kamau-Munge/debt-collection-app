// Application configuration
module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Karosa0797!',
    name: process.env.DB_NAME || 'debt_manager'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    from: process.env.SMTP_FROM || 'Debt Collection System <noreply@debtmanager.co.ke>'
  },

  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+254112851330',
    webhookUrl: process.env.WEBHOOK_URL || 'https://your-ngrok-url.ngrok.io/webhook'
  },

  // Phone service configuration
  phone: {
    enabled: process.env.PHONE_SERVICE_ENABLED !== 'false',
    mockMode: process.env.PHONE_MOCK_MODE === 'true' || !process.env.TWILIO_ACCOUNT_SID,
    defaultVoice: process.env.PHONE_DEFAULT_VOICE || 'alice',
    defaultLanguage: process.env.PHONE_DEFAULT_LANGUAGE || 'en-US',
    maxCallDuration: parseInt(process.env.PHONE_MAX_DURATION) || 300, // 5 minutes
    retryAttempts: parseInt(process.env.PHONE_RETRY_ATTEMPTS) || 3
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // KCB API Configuration
  kcb: {
    apiKey: process.env.KCB_API_KEY || 'your_kcb_api_key_here',
    apiSecret: process.env.KCB_API_SECRET || 'your_kcb_api_secret_here',
    merchantId: process.env.KCB_MERCHANT_ID || 'your_merchant_id',
    terminalId: process.env.KCB_TERMINAL_ID || 'your_terminal_id',
    baseURL: process.env.KCB_BASE_URL || 'https://uat.buni.kcbgroup.com/fundstransfer/1.0.0',
    callbackUrl: process.env.KCB_CALLBACK_URL || `http://localhost:${process.env.PORT || 5001}/api/kcb/callback`,
    timeoutUrl: process.env.KCB_TIMEOUT_URL || `http://localhost:${process.env.PORT || 5001}/api/kcb/timeout`,
    isDevelopment: (process.env.KCB_IS_DEVELOPMENT || 'true').toLowerCase() === 'true',
    accessToken: process.env.KCB_ACCESS_TOKEN || null
  },

  // MPESA API Configuration (disabled)
  mpesa: {
    enabled: false
  }
};
