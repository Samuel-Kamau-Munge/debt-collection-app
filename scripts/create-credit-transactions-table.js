const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Karosa0797!',
      database: process.env.DB_NAME || 'debt_manager'
    });

    const createSQL = `
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credit_account_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        description TEXT,
        transaction_date DATETIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_account (credit_account_id),
        INDEX idx_date (transaction_date)
      ) ENGINE=InnoDB;
    `;

    await conn.execute(createSQL);
    console.log('credit_transactions table ensured.');

    const [tables] = await conn.execute("SHOW TABLES LIKE 'credit_transactions'");
    console.log('Show Tables result:', tables);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Error ensuring credit_transactions table:', err);
    process.exit(1);
  }
})();