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

    const [rows] = await conn.execute(
      'SELECT id, user_id, credit_account_id, amount, transaction_type, description, transaction_date, status FROM credit_transactions ORDER BY transaction_date DESC, id DESC LIMIT 20'
    );

    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Query error:', err);
    process.exit(1);
  }
})();