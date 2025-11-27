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

    // Ensure table exists
    await conn.execute(`
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
    `);

    const [insertResult] = await conn.execute(
      `INSERT INTO credit_transactions (user_id, credit_account_id, amount, transaction_type, description, transaction_date, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 'completed')`,
      [1, 1, 100.00, 'withdrawal', 'Direct test insert']
    );

    const newId = insertResult.insertId;
    console.log('Inserted credit transaction ID:', newId);

    const [rows] = await conn.execute(
      'SELECT id, user_id, credit_account_id, amount, transaction_type, description, transaction_date, status FROM credit_transactions ORDER BY transaction_date DESC, id DESC LIMIT 5'
    );

    console.log('Recent credit_transactions rows:', JSON.stringify(rows, null, 2));

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Insert/query error:', err);
    process.exit(1);
  }
})();