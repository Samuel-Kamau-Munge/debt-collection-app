const express = require('express');
const debtRoutes = require('./routes/debts');
const db = require('./db');

const app = express();
app.use(express.json());

// Mount debt routes
app.use('/api/debts', debtRoutes);

// Test debt recording
const testDebtRecording = async () => {
  try {
    console.log('Testing debt recording...');
    
    // First, get a user ID from the database
    const connection = await db;
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    
    const userId = users[0].id;
    console.log('✅ Found user ID:', userId);
    
    // Test debt data
    const debtData = {
      debtor_name: 'Test Debtor',
      debtor_email: 'test@example.com',
      debtor_phone: '+254700000000',
      amount: 10000,
      category: 'business',
      description: 'Test debt',
      due_date: '2024-03-15',
      reference_number: 'TEST-001',
      interest_rate: 5.0,
      payment_terms: 'lump_sum',
      notes: 'Test debt recording'
    };
    
    // Insert debt directly into database
    const result = await connection.execute(`
      INSERT INTO debts (
        user_id, debtor_name, debtor_email, debtor_phone, amount, 
        category, description, due_date, reference_number, 
        interest_rate, payment_terms, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `, [
      userId, debtData.debtor_name, debtData.debtor_email, 
      debtData.debtor_phone, debtData.amount, debtData.category,
      debtData.description, debtData.due_date, debtData.reference_number,
      debtData.interest_rate, debtData.payment_terms, debtData.notes
    ]);
    
    console.log('✅ Debt recorded successfully!');
    console.log('📊 Debt ID:', result[0].insertId);
    
    // Verify the debt was recorded
    const [debts] = await connection.execute('SELECT * FROM debts WHERE id = ?', [result[0].insertId]);
    console.log('📋 Recorded debt:', debts[0]);
    
  } catch (error) {
    console.log('❌ Error recording debt:', error.message);
  }
};

testDebtRecording();

