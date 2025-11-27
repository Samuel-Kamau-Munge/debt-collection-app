const db = require('./db');

// Script to debug and fix payment method migration
async function debugAndFixPaymentMethods() {
  try {
    console.log('Debugging payment method migration...');
    
    const connection = await db;
    
    // First, let's see all transactions and their payment methods
    const [transactions] = await connection.execute(
      'SELECT id, payment_method FROM transactions'
    );
    
    console.log('All transactions:', transactions);
    
    // Let's see the exact column definition
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM transactions LIKE 'payment_method'"
    );
    
    console.log('Current payment_method column definition:', columns[0]);
    
    // Let's try a different approach - first set all to NULL, then alter column, then set default
    console.log('Step 1: Setting all payment_method values to NULL temporarily...');
    
    await connection.execute(
      'UPDATE transactions SET payment_method = NULL'
    );
    
    console.log('Step 2: Altering column to new ENUM...');
    
    await connection.execute(`
      ALTER TABLE transactions 
      MODIFY COLUMN payment_method ENUM('mpesa', 'kcb') DEFAULT 'mpesa'
    `);
    
    console.log('Step 3: Setting all NULL values to mpesa...');
    
    await connection.execute(
      'UPDATE transactions SET payment_method = "mpesa" WHERE payment_method IS NULL'
    );
    
    // Verify the result
    const [finalTransactions] = await connection.execute(
      'SELECT id, payment_method FROM transactions'
    );
    
    console.log('Final transactions:', finalTransactions);
    
    const [finalColumns] = await connection.execute(
      "SHOW COLUMNS FROM transactions LIKE 'payment_method'"
    );
    
    console.log('Final payment_method column definition:', finalColumns[0]);
    
    console.log('🎉 Payment method migration completed successfully!');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error during payment method migration:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  debugAndFixPaymentMethods()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = debugAndFixPaymentMethods;

