const db = require('./db');

// Script to alter the transactions table to update payment_method ENUM
async function alterPaymentMethodColumn() {
  try {
    console.log('Altering payment_method column to only allow M-Pesa and KCB...');
    
    const connection = await db;
    
    // First, let's see the current column definition
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM transactions LIKE 'payment_method'"
    );
    
    console.log('Current payment_method column:', columns[0]);
    
    // Alter the column to only allow mpesa and kcb
    await connection.execute(`
      ALTER TABLE transactions 
      MODIFY COLUMN payment_method ENUM('mpesa', 'kcb') DEFAULT 'mpesa'
    `);
    
    console.log('✅ Payment method column updated successfully');
    
    // Now let's migrate the existing data
    console.log('Migrating existing payment methods...');
    
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
      try {
        const [result] = await connection.execute(
          'UPDATE transactions SET payment_method = ? WHERE payment_method = ?',
          [newMethod, oldMethod]
        );
        
        if (result.affectedRows > 0) {
          console.log(`✅ Updated ${result.affectedRows} transactions from '${oldMethod}' to '${newMethod}'`);
        }
      } catch (error) {
        console.log(`ℹ️ No transactions found with payment method '${oldMethod}'`);
      }
    }
    
    // Verify the migration
    const [finalMethods] = await connection.execute(
      'SELECT DISTINCT payment_method FROM transactions WHERE payment_method IS NOT NULL'
    );
    
    console.log('✅ Final payment methods after migration:', finalMethods.map(row => row.payment_method));
    
    // Check the updated column definition
    const [updatedColumns] = await connection.execute(
      "SHOW COLUMNS FROM transactions LIKE 'payment_method'"
    );
    
    console.log('✅ Updated payment_method column:', updatedColumns[0]);
    
    console.log('🎉 Payment method migration completed successfully!');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error during payment method migration:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  alterPaymentMethodColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = alterPaymentMethodColumn;

