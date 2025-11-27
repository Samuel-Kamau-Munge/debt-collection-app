const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logging.level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  writeToFile(message) {
    fs.appendFileSync(config.logging.file, message + '\n');
  }

  log(level, message, meta = {}) {
    const levelNum = LOG_LEVELS[level];
    
    if (levelNum <= this.level) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      // Console output
      switch (level) {
        case 'ERROR':
          console.error(formattedMessage);
          break;
        case 'WARN':
          console.warn(formattedMessage);
          break;
        case 'INFO':
          console.info(formattedMessage);
          break;
        case 'DEBUG':
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
      
      // File output
      this.writeToFile(formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // Specialized logging methods
  logRequest(req, res, responseTime) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  logError(error, req = null) {
    this.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...(req && {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
    });
  }

  logDatabaseQuery(query, params = [], duration = null) {
    this.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: duration ? `${duration}ms` : null
    });
  }

  logAuth(action, userId, success = true, ip = null) {
    this.info('Authentication', {
      action,
      userId,
      success,
      ip
    });
  }

  logTransaction(type, amount, userId, details = {}) {
    this.info('Transaction', {
      type,
      amount,
      userId,
      ...details
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
