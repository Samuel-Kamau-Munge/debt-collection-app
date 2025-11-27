const db = require('./db');

// Migration script to update payment methods to only M-Pesa and KCB
async function migratePaymentMethods() {
  try {
    console.log('Starting payment method migration...');
    
    const connection = await db;
    
    // First, let's see what payment methods currently exist
    const [currentMethods] = await connection.execute(
      'SELECT DISTINCT payment_method FROM transactions WHERE payment_method IS NOT NULL'
    );
    
    console.log('Current payment methods found:', currentMethods.map(row => row.payment_method));
    
    // Update payment methods to M-Pesa or KCB based on existing values
    const migrationMap = {
      'cash': 'mpesa',
      'check': 'kcb',
      'cheque': 'kcb',
      'bank_transfer': 'kcb',
      'credit_card': 'kcb',
      'mobile_money': 'mpesa',
      'other': 'mpesa'
    };
    
    for (const [oldMethod, newMethod] of Object.entries(migrationMap)) {
      const [result] = await connection.execute(
        'UPDATE transactions SET payment_method = ? WHERE payment_method = ?',
        [newMethod, oldMethod]
      );
      
      if (result.affectedRows > 0) {
        console.log(`Updated ${result.affectedRows} transactions from '${oldMethod}' to '${newMethod}'`);
      }
    }
    
    // Update any remaining invalid payment methods to M-Pesa
    const [invalidResult] = await connection.execute(
      'UPDATE transactions SET payment_method = ? WHERE payment_method NOT IN (?, ?)',
      ['mpesa', 'mpesa', 'kcb']
    );
    
    if (invalidResult.affectedRows > 0) {
      console.log(`Updated ${invalidResult.affectedRows} transactions with invalid payment methods to 'mpesa'`);
    }
    
    // Verify the migration
    const [finalMethods] = await connection.execute(
      'SELECT DISTINCT payment_method FROM transactions WHERE payment_method IS NOT NULL'
    );
    
    console.log('Final payment methods after migration:', finalMethods.map(row => row.payment_method));
    
    console.log('Payment method migration completed successfully!');
    
  } catch (error) {
    console.error('Error during payment method migration:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migratePaymentMethods()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migratePaymentMethods;

