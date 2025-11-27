const db = require('./db');

const createTestUser = async () => {
  try {
    const connection = await db;
    await connection.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', ['testuser', 'test@example.com', 'password123']);
    console.log('Test user created successfully');
    await connection.end();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
};

createTestUser();
