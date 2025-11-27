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
      'SELECT id, creditor_name, amount, credit_limit, updated_at FROM credits WHERE id = 1'
    );

    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Query error:', err);
    process.exit(1);
  }
})();