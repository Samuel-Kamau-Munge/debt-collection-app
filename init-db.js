const db = require('./config/database');

// Create all tables for the debt management system
const createTables = async () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    

    
    // Debts table
    `CREATE TABLE IF NOT EXISTS debts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      debtor_name VARCHAR(255) NOT NULL,
      debtor_email VARCHAR(255),
      debtor_phone VARCHAR(20),
      amount DECIMAL(15,2) NOT NULL,
      category VARCHAR(50),
      description TEXT,
      due_date DATE NOT NULL,
      reference_number VARCHAR(255),
      status ENUM('active', 'paid', 'cancelled') DEFAULT 'active',
      interest_rate DECIMAL(5,2) DEFAULT 0.00,
      payment_terms VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // Credits table
    `CREATE TABLE IF NOT EXISTS credits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      creditor_name VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      credit_limit DECIMAL(15,2),
      category ENUM('accounts_payable', 'credit_line', 'vendor_credit', 'loan') NOT NULL,
      description TEXT,
      status ENUM('active', 'inactive', 'closed') DEFAULT 'active',
      interest_rate DECIMAL(5,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      payer_name VARCHAR(255),
      debt_id INT,
      credit_id INT,
      type ENUM('payment_received', 'payment_made', 'debt_created', 'credit_created') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      payment_method ENUM('kcb') DEFAULT 'kcb',
      description TEXT,
      payment_date DATE,
      transaction_date DATE NOT NULL,
      status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
      reference_number VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE SET NULL,
      FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE SET NULL
    )`,
    
    // Payment schedule table
    `CREATE TABLE IF NOT EXISTS payment_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      debt_id INT NOT NULL,
      scheduled_date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
    )`,
    
    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('payment_due', 'payment_overdue', 'credit_limit', 'system', 'reminder', 'alert') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      related_id INT,
      related_type ENUM('debt', 'credit', 'client', 'transaction') DEFAULT NULL,
      priority ENUM('urgent', 'high', 'medium', 'low') DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  let connection;
  try {
    connection = await db.getConnection();

    for (let i = 0; i < tables.length; i++) {
      try {
        await connection.execute(tables[i]);
        console.log(`Table ${i + 1} created successfully`);
      } catch (err) {
        console.error(`Error creating table ${i + 1}:`, err);
      }
    }

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    if (connection) connection.release();
  }
};

createTables();
