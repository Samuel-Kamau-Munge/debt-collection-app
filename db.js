const mysql = require('mysql2/promise');

// Create a connection to the MySQL database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Karosa0797!',
  database: 'debt_manager',
  port: 3307
});

// Test the connection
db.then(connection => {
  console.log('Connected to MySQL database');
  return connection;
}).catch(err => {
  console.error('Error connecting to MySQL:', err);
});

module.exports = db;
