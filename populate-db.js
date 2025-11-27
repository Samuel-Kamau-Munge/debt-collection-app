const db = require('./db');

// Populate the database with sample data
const populateDatabase = async () => {
  try {
    const connection = await db;

    // Insert sample users
    await connection.execute(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, phone) VALUES
      ('jomo_kenyatta', 'jomo@example.com', '$2b$10$dummyhash', 'Jomo', 'Kenyatta', '+254712345670'),
      ('wangari_maathai', 'wangari@example.com', '$2b$10$dummyhash', 'Wangari', 'Maathai', '+254712345671'),
      ('uhuru_kenyatta', 'uhuru@example.com', '$2b$10$dummyhash', 'Uhuru', 'Kenyatta', '+254712345672')
    `);
    console.log('Users inserted successfully');

    // Insert sample debts
    await connection.execute(`
      INSERT INTO debts (user_id, debtor_name, debtor_email, debtor_phone, amount, category, description, due_date, reference_number, status, interest_rate, payment_terms, notes) VALUES
      (1, 'Alice Johnson', 'alice@debtor.com', '+1234567893', 5000.00, 'personal', 'Loan for car repair', '2024-12-31', 'REF001', 'active', 5.00, 'Monthly payments', 'Urgent payment needed'),
      (1, 'Tech Corp', 'billing@techcorp.com', '+1234567894', 15000.00, 'business', 'Office equipment purchase', '2024-11-15', 'REF002', 'active', 8.00, 'Quarterly payments', 'Large business debt'),
      (2, 'Mike Davis', 'mike@friend.com', '+1234567895', 2000.00, 'personal', 'Personal loan', '2024-10-20', 'REF003', 'paid', 0.00, 'One-time payment', 'Already settled'),
      (3, 'Green Supplies Ltd', 'accounts@greensupplies.com', '+1234567896', 7500.00, 'business', 'Inventory purchase', '2024-12-01', 'REF004', 'active', 6.50, 'Bi-monthly payments', 'Regular supplier debt')
    `);
    console.log('Debts inserted successfully');

    // Insert sample credits
    await connection.execute(`
      INSERT INTO credits (user_id, creditor_name, amount, credit_limit, category, description, status, interest_rate) VALUES
      (1, 'Bank of America', 25000.00, 50000.00, 'credit_line', 'Personal credit line', 'active', 12.99),
      (1, 'ABC Vendor', 10000.00, NULL, 'vendor_credit', 'Supplier credit account', 'active', 0.00),
      (2, 'Chase Bank', 15000.00, 30000.00, 'loan', 'Business loan', 'active', 9.75),
      (3, 'XYZ Finance', 5000.00, 10000.00, 'credit_line', 'Small business credit', 'inactive', 15.00)
    `);
    console.log('Credits inserted successfully');

    // Insert sample transactions
    await connection.execute(`
      INSERT INTO transactions (user_id, payer_name, debt_id, credit_id, type, amount, payment_method, description, payment_date, transaction_date, status, reference_number, notes) VALUES
      (1, 'Alice Johnson', 1, NULL, 'payment_received', 1000.00, 'mpesa', 'Partial payment for car repair loan', '2024-09-15', '2024-09-15', 'completed', 'TXN001', 'Received via M-Pesa'),
      (1, 'Tech Corp', 2, NULL, 'payment_received', 5000.00, 'kcb', 'Quarterly payment for equipment', '2024-09-01', '2024-09-01', 'completed', 'TXN002', 'Bank transfer'),
      (2, 'Mike Davis', 3, NULL, 'payment_received', 2000.00, 'mpesa', 'Full settlement of personal loan', '2024-08-20', '2024-08-20', 'completed', 'TXN003', 'Loan fully paid'),
      (1, NULL, NULL, 1, 'payment_made', 2500.00, 'mpesa', 'Credit card payment', '2024-09-10', '2024-09-10', 'completed', 'TXN004', 'Monthly minimum payment'),
      (3, 'Green Supplies Ltd', 4, NULL, 'payment_received', 2500.00, 'kcb', 'Bi-monthly payment', '2024-09-05', '2024-09-05', 'completed', 'TXN005', 'Partial payment received')
    `);
    console.log('Transactions inserted successfully');

    // Insert sample payment schedules
    await connection.execute(`
      INSERT INTO payment_schedules (user_id, debt_id, scheduled_date, amount, status, notes) VALUES
      (1, 1, '2024-10-15', 1500.00, 'pending', 'Next monthly payment'),
      (1, 1, '2024-11-15', 1500.00, 'pending', 'Following monthly payment'),
      (1, 2, '2024-12-15', 5000.00, 'pending', 'Quarterly payment due'),
      (2, 3, '2024-10-20', 2000.00, 'paid', 'Already paid in full'),
      (3, 4, '2024-10-01', 2500.00, 'pending', 'Next bi-monthly payment'),
      (3, 4, '2024-10-15', 2500.00, 'pending', 'Final bi-monthly payment')
    `);
    console.log('Payment schedules inserted successfully');

    // Insert sample notifications
    await connection.execute(`
      INSERT INTO notifications (user_id, type, title, message, is_read, related_id, related_type) VALUES
      (1, 'payment_due', 'Payment Due Soon', 'Your payment of $1500.00 for Alice Johnson is due on 2024-10-15', FALSE, 1, 'debt'),
      (1, 'payment_overdue', 'Overdue Payment', 'Payment for Tech Corp equipment was due on 2024-09-15', FALSE, 2, 'debt'),
      (2, 'system', 'Welcome to Debt Manager', 'Thank you for joining our debt management platform!', TRUE, NULL, NULL),
      (3, 'credit_limit', 'Credit Limit Warning', 'You are approaching your credit limit with Green Supplies Ltd', FALSE, 4, 'debt'),
      (1, 'payment_due', 'Upcoming Payment Reminder', 'Remember to pay your credit card minimum by 2024-09-25', FALSE, 1, 'credit')
    `);
    console.log('Notifications inserted successfully');

    console.log('Database populated successfully');
    await connection.end();
  } catch (error) {
    console.error('Error populating database:', error);
  }
};

populateDatabase();
