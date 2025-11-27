const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config/config');

const JWT_SECRET = config.jwt.secret;

// Generate JWT tokens for all users
const generateTokens = async () => {
  try {
    const connection = await db;
    const [users] = await connection.execute('SELECT id, username FROM users');

    console.log('Generated JWT tokens for users:');
    users.forEach(user => {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      console.log(`User: ${user.username}, Token: ${token}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error generating tokens:', error);
  }
};

generateTokens();
