const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userId = parseInt(process.argv[2] || '1', 10);
const payload = { id: userId, email: `user${userId}@example.com`, name: `User ${userId}` };
const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
console.log(token);