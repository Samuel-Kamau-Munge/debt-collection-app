const db = require('../config/database');
const logger = require('../utils/logger');

// Enhanced database initialization with additional tables
const createTables = async () => {
  const tables = [
    // Users table (enhanced)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      phone VARCHAR(20),
      avatar_url VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      email_verified BOOLEAN DEFAULT FALSE,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_is_active (is_active)
    )`,

    // Debts table (enhanced)
    `CREATE TABLE IF NOT EXISTS debts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      debtor_name VARCHAR(255) NOT NULL,
      debtor_email VARCHAR(255),
      debtor_phone VARCHAR(20),
      debtor_address TEXT,
      amount DECIMAL(15,2) NOT NULL,
      category VARCHAR(50),
      description TEXT,
      due_date DATE NOT NULL,
      reference_number VARCHAR(255),
      status ENUM('pending', 'active', 'paid', 'cancelled', 'overdue') DEFAULT 'pending',
      interest_rate DECIMAL(5,2) DEFAULT 0.00,
      payment_terms VARCHAR(100),
      notes TEXT,
      priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
      collection_attempts INT DEFAULT 0,
      last_collection_attempt TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_due_date (due_date),
      INDEX idx_category (category),
      INDEX idx_debtor_name (debtor_name)
    )`,

    // Credits table (enhanced)
    `CREATE TABLE IF NOT EXISTS credits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      creditor_name VARCHAR(255) NOT NULL,
      creditor_email VARCHAR(255),
      creditor_phone VARCHAR(20),
      amount DECIMAL(15,2) NOT NULL,
      credit_limit DECIMAL(15,2),
      category ENUM('accounts_payable', 'credit_line', 'vendor_credit', 'loan', 'credit_card', 'other') NOT NULL,
      description TEXT,
      status ENUM('active', 'inactive', 'closed', 'suspended') DEFAULT 'active',
      interest_rate DECIMAL(5,2) DEFAULT 0.00,
      payment_due_date DATE,
      minimum_payment DECIMAL(15,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_category (category),
      INDEX idx_creditor_name (creditor_name)
    )`,

    // Transactions table (enhanced)
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      payer_name VARCHAR(255),
      debt_id INT,
      credit_id INT,
      type ENUM('payment_received', 'payment_made', 'debt_created', 'credit_created', 'refund', 'adjustment') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'mobile_money', 'cryptocurrency', 'other') DEFAULT 'cash',
      description TEXT,
      payment_date DATE,
      transaction_date DATE NOT NULL,
      status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'completed',
      reference_number VARCHAR(255),
      notes TEXT,
      fees DECIMAL(15,2) DEFAULT 0.00,
      exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
      currency VARCHAR(3) DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE SET NULL,
      FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type),
      INDEX idx_status (status),
      INDEX idx_transaction_date (transaction_date),
      INDEX idx_debt_id (debt_id),
      INDEX idx_credit_id (credit_id)
    )`,

    // Payment schedules table (enhanced)
    `CREATE TABLE IF NOT EXISTS payment_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      debt_id INT NOT NULL,
      scheduled_date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      status ENUM('pending', 'paid', 'overdue', 'cancelled', 'partial') DEFAULT 'pending',
      payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'mobile_money', 'other') DEFAULT 'cash',
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_debt_id (debt_id),
      INDEX idx_scheduled_date (scheduled_date),
      INDEX idx_status (status)
    )`,

    // Notifications table (enhanced)
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('payment_due', 'payment_overdue', 'credit_limit', 'system', 'reminder', 'alert') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      related_id INT,
      related_type ENUM('debt', 'credit', 'transaction', 'payment_schedule', 'user') DEFAULT NULL,
      priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type),
      INDEX idx_is_read (is_read),
      INDEX idx_priority (priority),
      INDEX idx_created_at (created_at)
    )`,

    // File attachments table
    `CREATE TABLE IF NOT EXISTS file_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      related_id INT,
      related_type ENUM('debt', 'credit', 'transaction', 'payment_schedule', 'user') DEFAULT NULL,
      description TEXT,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_related (related_id, related_type),
      INDEX idx_mime_type (mime_type)
    )`,

    // Audit logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      record_id INT,
      old_values JSON,
      new_values JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_action (action),
      INDEX idx_table_name (table_name),
      INDEX idx_created_at (created_at)
    )`,

    // User settings table
    `CREATE TABLE IF NOT EXISTS user_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_setting (user_id, setting_key),
      INDEX idx_user_id (user_id)
    )`,

    // Email templates table
    `CREATE TABLE IF NOT EXISTS email_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      subject VARCHAR(255) NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      variables JSON,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_is_active (is_active)
    )`,

    // System logs table
    `CREATE TABLE IF NOT EXISTS system_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      level ENUM('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL') NOT NULL,
      message TEXT NOT NULL,
      context JSON,
      user_id INT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_level (level),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    )`
  ];

  try {
    const connection = await db;
    
    for (let i = 0; i < tables.length; i++) {
      try {
        await connection.execute(tables[i]);
        logger.info(`Table ${i + 1} created successfully`);
      } catch (error) {
        logger.error(`Error creating table ${i + 1}:`, { error: error.message });
        throw error;
      }
    }

    // Insert default email templates
    await insertDefaultEmailTemplates(connection);
    
    // Insert default user settings
    await insertDefaultUserSettings(connection);

    logger.info('All tables created successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', { error: error.message });
    throw error;
  }
};

// Insert default email templates
const insertDefaultEmailTemplates = async (connection) => {
  const templates = [
    {
      name: 'payment_due_reminder',
      subject: 'Payment Due Reminder - {{debtor_name}}',
      body_html: `
        <h2>Payment Due Reminder</h2>
        <p>Dear {{user_name}},</p>
        <p>This is a reminder that a payment is due:</p>
        <ul>
          <li><strong>Debtor:</strong> {{debtor_name}}</li>
          <li><strong>Amount:</strong> ${{amount}}</li>
          <li><strong>Due Date:</strong> {{due_date}}</li>
          <li><strong>Description:</strong> {{description}}</li>
        </ul>
        <p>Please follow up with the debtor to ensure timely payment.</p>
      `,
      body_text: `
        Payment Due Reminder
        
        Dear {{user_name}},
        
        This is a reminder that a payment is due:
        
        Debtor: {{debtor_name}}
        Amount: ${{amount}}
        Due Date: {{due_date}}
        Description: {{description}}
        
        Please follow up with the debtor to ensure timely payment.
      `,
      variables: JSON.stringify(['user_name', 'debtor_name', 'amount', 'due_date', 'description'])
    },
    {
      name: 'payment_overdue_alert',
      subject: 'URGENT: Payment Overdue - {{debtor_name}}',
      body_html: `
        <h2 style="color: red;">Payment Overdue Alert</h2>
        <p>Dear {{user_name}},</p>
        <p>This is an urgent alert that a payment is overdue:</p>
        <ul>
          <li><strong>Debtor:</strong> {{debtor_name}}</li>
          <li><strong>Amount:</strong> ${{amount}}</li>
          <li><strong>Due Date:</strong> {{due_date}}</li>
          <li><strong>Days Overdue:</strong> {{days_overdue}}</li>
        </ul>
        <p style="color: red;"><strong>Please take immediate action to collect this overdue payment.</strong></p>
      `,
      body_text: `
        URGENT: Payment Overdue Alert
        
        Dear {{user_name}},
        
        This is an urgent alert that a payment is overdue:
        
        Debtor: {{debtor_name}}
        Amount: ${{amount}}
        Due Date: {{due_date}}
        Days Overdue: {{days_overdue}}
        
        Please take immediate action to collect this overdue payment.
      `,
      variables: JSON.stringify(['user_name', 'debtor_name', 'amount', 'due_date', 'days_overdue'])
    }
  ];

  for (const template of templates) {
    try {
      await connection.execute(
        `INSERT IGNORE INTO email_templates (name, subject, body_html, body_text, variables) 
         VALUES (?, ?, ?, ?, ?)`,
        [template.name, template.subject, template.body_html, template.body_text, template.variables]
      );
    } catch (error) {
      logger.warn(`Failed to insert email template ${template.name}:`, { error: error.message });
    }
  }
};

// Insert default user settings
const insertDefaultUserSettings = async (connection) => {
  const defaultSettings = [
    { key: 'email_notifications', value: 'true' },
    { key: 'sms_notifications', value: 'false' },
    { key: 'payment_reminder_days', value: '7' },
    { key: 'overdue_alert_days', value: '1' },
    { key: 'credit_limit_threshold', value: '80' },
    { key: 'timezone', value: 'UTC' },
    { key: 'date_format', value: 'YYYY-MM-DD' },
    { key: 'currency', value: 'USD' },
    { key: 'theme', value: 'light' }
  ];

  // This will be populated when users are created
  logger.info('Default user settings template prepared');
};

// Run the initialization
if (require.main === module) {
  createTables()
    .then(() => {
      logger.info('Database initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database initialization failed:', { error: error.message });
      process.exit(1);
    });
}

module.exports = { createTables };
