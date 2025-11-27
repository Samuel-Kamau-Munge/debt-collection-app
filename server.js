const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const notificationScheduler = require('./services/notificationScheduler');
require('dotenv').config({ override: true });

// Import configurations and middleware
const config = require('./config/config');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const { 
  generalLimiter, 
  authLimiter, 
  apiLimiter, 
  securityHeaders, 
  sanitizeData, 
  xssProtection, 
  hppProtection, 
  corsOptions, 
  requestLogger, 
  responseTime, 
  requestSizeLimiter 
} = require('./middleware/security');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const debtRoutes = require('./routes/debts');
const creditRoutes = require('./routes/credits');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');

const kcbRoutes = require('./routes/kcb');
const fileRoutes = require('./routes/files');
const webhookRoutes = require('./routes/webhooks');
const emailAlertRoutes = require('./routes/emailAlerts');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
// Expose socket to services that emit notifications
global.io = io;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware - temporarily disabled due to middleware conflicts
// app.use(securityHeaders);
// app.use(sanitizeData); // Temporarily disabled due to express-mongo-sanitize issue
// app.use(xssProtection); // Temporarily disabled due to potential conflicts
// app.use(hppProtection); // Temporarily disabled due to potential conflicts

// CORS configuration
app.use(cors(corsOptions));

// Request logging and response time
app.use(requestLogger);
app.use(responseTime);

// Request size limiting
app.use(requestSizeLimiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - temporarily disabled for testing
// app.use('/api/auth', authLimiter);
// app.use('/api', apiLimiter);
// app.use('/', generalLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/debts', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/api/debts', debtRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/kcb', kcbRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/email-alerts', emailAlertRoutes);
app.use('/webhook', webhookRoutes);


// Dashboard module static files (CSS and JS) - specific routes
app.get('/dashboard/overview/analytics/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/analytics/styles.css');
});

app.get('/dashboard/overview/analytics/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/analytics/script.js');
});

app.get('/dashboard/overview/reports/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/reports/styles.css');
});

app.get('/dashboard/overview/reports/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/reports/script.js');
});

app.get('/dashboard/debt-management/record-debt/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/record-debt/styles.css');
});

app.get('/dashboard/debt-management/record-debt/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/record-debt/script.js');
});

// Removed routes for deleted pages: view-debts and debt-categories assets


// Cache-busting routes for dashboard-modules (correct path)
// Removed cache-busting routes for deleted modules: view-debts and debt-categories


app.get('/dashboard-modules/debt-management/payment-schedule/script.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/payment-schedule/script.js');
});

app.get('/dashboard-modules/debt-management/record-debt/script.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/record-debt/script.js');
});

app.get('/dashboard-modules/shared/module-template.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/shared/module-template.js');
});

app.get('/dashboard/debt-management/payment-schedule/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/payment-schedule/styles.css');
});

app.get('/dashboard/debt-management/payment-schedule/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/payment-schedule/script.js');
});

// Receive Payment routes
app.get('/dashboard/debt-management/receive-payment', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/index.html');
});

app.get('/dashboard/debt-management/receive-payment/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/styles.css');
});

app.get('/dashboard/debt-management/receive-payment/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/script.js');
});

// Credit Management routes

app.get('/dashboard/credit-management/credit-accounts', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-accounts/index.html');
});

app.get('/dashboard/credit-management/credit-accounts/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-accounts/styles.css');
});

app.get('/dashboard/credit-management/credit-accounts/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-accounts/script.js');
});

app.get('/dashboard/credit-management/credit-transactions', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-transactions/index.html');
});

app.get('/dashboard/credit-management/credit-transactions/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-transactions/styles.css');
});

app.get('/dashboard/credit-management/credit-transactions/script.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-transactions/script.js');
});


app.get('/dashboard/credit-management/record-credit/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/record-credit/styles.css');
});

app.get('/dashboard/credit-management/record-credit/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/record-credit/script.js');
});

app.get('/dashboard/credit-management/view-credits/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/view-credits/styles.css');
});

app.get('/dashboard/credit-management/view-credits/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/view-credits/script.js');
});

app.get('/dashboard/credit-management/credit-limits/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-limits/styles.css');
});

app.get('/dashboard/credit-management/credit-limits/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-limits/script.js');
});

app.get('/dashboard/credit-management/credit-reports/styles.css', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-reports/styles.css');
});

app.get('/dashboard/credit-management/credit-reports/script.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-reports/script.js');
});

app.get('/dashboard/transaction-management/receive-payment/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/receive-payment/styles.css');
});

app.get('/dashboard/transaction-management/receive-payment/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/receive-payment/script.js');
});

app.get('/dashboard/transaction-management/make-payment/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/make-payment/styles.css');
});

app.get('/dashboard/transaction-management/make-payment/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/make-payment/script.js');
});

app.get('/dashboard/transaction-management/transaction-history/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/transaction-history/styles.css');
});

app.get('/dashboard/transaction-management/transaction-history/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/transaction-history/script.js');
});

app.get('/dashboard/transaction-management/pending-transactions/styles.css', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/pending-transactions/styles.css');
});

app.get('/dashboard/transaction-management/pending-transactions/script.js', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/pending-transactions/script.js');
});

// Cache-busting for Receive Payment module (debt-management)
app.get('/dashboard-modules/debt-management/receive-payment/index.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/index.html');
});

app.get('/dashboard-modules/debt-management/receive-payment/script.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/script.js');
});

app.get('/dashboard-modules/debt-management/receive-payment/styles.css', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/receive-payment/styles.css');
});

// Dashboard routes for modular structure
app.get('/dashboard', (req, res) => {
  console.log('Dashboard route hit: /dashboard');
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/dashboard/', (req, res) => {
  console.log('Dashboard route hit: /dashboard/');
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/dashboard/general', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/dashboard/overview/analytics', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/analytics/index.html');
});

app.get('/dashboard/overview/reports', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/overview/reports/index.html');
});

app.get('/dashboard/debt-management/record-debt', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/record-debt/index.html');
});

// Removed dashboard routes for deleted pages: view-debts and debt-categories


app.get('/dashboard/debt-management/payment-schedule', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/debt-management/payment-schedule/index.html');
});

app.get('/dashboard/credit-management/record-credit', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/record-credit/index.html');
});

app.get('/dashboard/credit-management/credit-reports', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-reports/index.html');
});

// Authentication pages
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/public/signup.html');
});

// Legacy: disable home page; redirect to login
app.get('/home', (req, res) => {
  res.redirect('/login');
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Email alert test page
app.get('/email-alert-test', (req, res) => {
  res.sendFile(__dirname + '/public/email-alert-test.html');
});

// Real-time notifications test page
app.get('/realtime-notifications-test', (req, res) => {
  res.sendFile(__dirname + '/public/realtime-notifications-test.html');
});

// Start background notification scheduler so alerts are generated from DB state
try {
  if (!notificationScheduler.isRunning) {
    notificationScheduler.start();
    logger.info('Notification scheduler started on server boot');
  }
} catch (e) {
  logger.error('Failed to start notification scheduler on boot', { error: e.message });
}

// Test notifications page
app.get('/test-notifications', (req, res) => {
  res.sendFile(__dirname + '/public/test-notifications.html');
});

app.get('/dashboard/credit-management/credit-limits', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/credit-limits/index.html');
});

app.get('/dashboard/credit-management/view-credits', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/credit-management/view-credits/index.html');
});

app.get('/dashboard/transaction-management/receive-payment', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/receive-payment/index.html');
});

app.get('/dashboard/transaction-management/transaction-history', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/transaction-history/index.html');
});

app.get('/dashboard/transaction-management/pending-transactions', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/pending-transactions/index.html');
});

app.get('/dashboard/transaction-management/make-payment', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-modules/transaction-management/make-payment/index.html');
});

// Serve static files from the 'public' directory (after all custom routes)
app.use(express.static('public'));

// Default route - check authentication and redirect accordingly
app.get('/', (req, res) => {
  // Check for JWT token in cookies or Authorization header
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.jwt.secret);
      // User is authenticated, redirect to dashboard
      return res.redirect('/dashboard');
    } catch (error) {
      // Token is invalid, redirect to login
      return res.redirect('/login');
    }
  }

  // No token found, redirect to login
  res.redirect('/login');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: '1.0.0'
  });
});

// 404 handler for API routes - temporarily commented out due to path-to-regexp issue
// app.use('/api/*', (req, res) => {
//   res.status(404).json({
//     status: 'error',
//     message: 'API endpoint not found'
//   });
// });

// Global error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Handle user authentication and join user-specific room
  socket.on('authenticate', (data) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(data.token, config.jwt.secret);
      socket.userId = decoded.id;
      socket.join(`user_${decoded.id}`);
      logger.info(`User ${decoded.id} authenticated and joined room`);
      socket.emit('authenticated', { userId: decoded.id });
    } catch (error) {
      logger.error('Socket authentication failed:', error.message);
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available globally for sending notifications
global.io = io;

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.server.env} mode`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.env}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO server ready`);
  
  // Start notification scheduler
  notificationScheduler.start();
  console.log(`🔔 Notification scheduler started`);
});

