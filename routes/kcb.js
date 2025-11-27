const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');
const notificationService = require('../services/notificationService');
const emailAlertService = require('../services/emailAlertService');

const config = require('../config/config');

// KCB API Configuration
const KCB_CONFIG = config.kcb;

// Get KCB access token
async function getKCBAccessToken() {
  try {
    // If a pre-provided access token exists, use it directly
    if (KCB_CONFIG.accessToken) {
      return KCB_CONFIG.accessToken;
    }

    const auth = Buffer.from(`${KCB_CONFIG.apiKey}:${KCB_CONFIG.apiSecret}`).toString('base64');

    console.log('Attempting to get KCB access token...');
    console.log('Base URL:', KCB_CONFIG.baseURL);

    const response = await axios.post(`${KCB_CONFIG.baseURL}/oauth/token`, {
      grant_type: 'client_credentials',
      scope: 'payment'
    }, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('KCB Access token response:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting KCB access token:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw new Error(`Failed to get KCB access token: ${error.response?.data?.errorMessage || error.message}`);
  }
}

// Initiate KCB Payment
router.post('/initiate-payment', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc, accountNumber, userId, debtId } = req.body;
    
    // Validate required fields
    if (!phoneNumber || !amount || !accountReference) {
      return res.status(400).json({ 
        error: 'Missing required fields: phoneNumber, amount, accountReference' 
      });
    }
    
  // Extract debt_id from accountReference if not provided (format: DEBT-{debt_id})
  let extractedDebtId = debtId;
  let extractedUserId = userId;
  
  if (accountReference && accountReference.startsWith('DEBT-')) {
    extractedDebtId = parseInt(accountReference.replace('DEBT-', ''));
  }
  
  // Format phone number (remove leading + or 0, add 254)
  let formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '');
  if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone;
  }
  
  // Generate transaction reference
  const transactionRef = 'KCB_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  let paymentId = null;
  let isDevelopmentMode = false;
  
  try {
    // Get access token
    const accessToken = await getKCBAccessToken();
    
    // KCB Payment payload
    const paymentPayload = {
      merchantId: KCB_CONFIG.merchantId,
      terminalId: KCB_CONFIG.terminalId,
      transactionRef: transactionRef,
      amount: Math.round(parseFloat(amount)), // Amount in Ksh
      currency: 'KES',
      phoneNumber: formattedPhone,
      accountNumber: accountNumber || null,
      accountReference: accountReference,
      description: transactionDesc || 'Debt Payment',
      callbackUrl: KCB_CONFIG.callbackUrl,
      timeoutUrl: KCB_CONFIG.timeoutUrl
    };
    
    console.log('KCB Payment Payload:', JSON.stringify(paymentPayload, null, 2));
    
    // Make KCB Payment request
    console.log('Making KCB Payment request to:', `${KCB_CONFIG.baseURL}/payments/initiate`);
    
    const response = await axios.post(
      `${KCB_CONFIG.baseURL}/payments/initiate`,
      paymentPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
          timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('KCB Payment Response:', response.data);
    
    paymentId = response.data.paymentId;
    
  } catch (apiError) {
    console.error('KCB API Error:', apiError.response?.data || apiError.message);
    
    // Development mode fallback: Return enhanced mock response
    console.log('Development Mode: Using enhanced mock KCB response...');
    isDevelopmentMode = true;
    
    paymentId = 'KCB_PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
    
    // Create pending transaction in database if we have userId and debtId
    if (extractedUserId && extractedDebtId && transactionRef) {
      try {
        const connection = await db;
        await connection.execute(
          `INSERT INTO transactions 
           (user_id, debt_id, type, amount, payment_method, description, transaction_date, status, reference_number, created_at)
           VALUES (?, ?, 'pay', ?, 'kcb', ?, ?, 'pending', ?, NOW())
           ON DUPLICATE KEY UPDATE 
           reference_number = VALUES(reference_number),
           updated_at = CURRENT_TIMESTAMP`,
          [
            extractedUserId,
            extractedDebtId,
            parseFloat(amount),
            transactionDesc || 'KCB payment pending',
            new Date().toISOString().split('T')[0],
            transactionRef
          ]
        );
      } catch (dbError) {
        console.error('Error creating pending transaction:', dbError);
        // Don't fail the request if DB insert fails
      }
    }
    
    res.json({
      success: true,
      message: isDevelopmentMode ? 'KCB Payment initiated successfully (Development Mode)' : 'KCB Payment initiated successfully',
      transactionRef: transactionRef,
      paymentId: paymentId,
      status: 'PENDING',
      developmentMode: isDevelopmentMode,
      note: isDevelopmentMode ? 'Development mode: Using mock KCB credentials. Real payments will work once you get API credentials from KCB.' : undefined,
      phoneNumber: formattedPhone,
      amount: amount,
      accountReference: accountReference
    });
    
  } catch (error) {
    console.error('Error initiating KCB Payment:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to initiate KCB payment',
      details: error.response?.data || error.message
    });
  }
});

// Query KCB Payment status
router.post('/query-payment', async (req, res) => {
  try {
    const { transactionRef, paymentId } = req.body;
    
    if (!transactionRef && !paymentId) {
      return res.status(400).json({ error: 'transactionRef or paymentId is required' });
    }
    
    // Check if this is a mock transaction reference
    if (transactionRef && transactionRef.startsWith('KCB_')) {
      // Mock mode - simulate successful payment after a few seconds
      const timeSinceRequest = Date.now() - parseInt(transactionRef.split('_')[1]);
      const secondsElapsed = Math.floor(timeSinceRequest / 1000);
      
      if (secondsElapsed < 3) {
        // Still processing
        res.json({
          success: true,
          status: 'PENDING',
          transactionRef: transactionRef,
          paymentId: paymentId || transactionRef.replace('KCB_', 'KCB_PAY_'),
          message: 'Payment is being processed',
          mockMode: true
        });
      } else {
        // Payment completed
        res.json({
          success: true,
          status: 'COMPLETED',
          transactionRef: transactionRef,
          paymentId: paymentId || transactionRef.replace('KCB_', 'KCB_PAY_'),
          message: 'Payment completed successfully',
          mockMode: true
        });
      }
      return;
    }
    
    try {
      const accessToken = await getKCBAccessToken();
      
      const queryPayload = {
        transactionRef: transactionRef,
        paymentId: paymentId
      };
      
      const response = await axios.post(
        `${KCB_CONFIG.baseURL}/payments/query`,
        queryPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      res.json({
        success: true,
        status: response.data.status,
        transactionRef: response.data.transactionRef,
        paymentId: response.data.paymentId,
        message: response.data.message
      });
      
    } catch (apiError) {
      console.error('KCB Query API Error:', apiError.response?.data || apiError.message);
      res.status(500).json({ 
        error: 'Failed to query KCB payment status',
        details: apiError.response?.data || apiError.message
      });
    }
    
  } catch (error) {
    console.error('Error querying KCB Payment:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to query KCB payment status',
      details: error.response?.data || error.message
    });
  }
});

// Callback endpoint for KCB notifications
router.post('/callback', async (req, res) => {
  try {
    const { transactionRef, paymentId, status, amount, phoneNumber, accountReference } = req.body;
    
    if (status === 'COMPLETED') {
      // Payment successful
      const paymentAmount = parseFloat(amount);
      let debtId = null;
      let userId = null;
      
      // Extract debt_id from accountReference (format: DEBT-{debt_id})
      if (accountReference && accountReference.startsWith('DEBT-')) {
        debtId = parseInt(accountReference.replace('DEBT-', ''));
      }
      
      const connection = await db;
      
      // Try to find existing pending transaction by transactionRef
      const [existingTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE reference_number = ? AND payment_method = ? AND status = ?',
        [transactionRef, 'kcb', 'pending']
      );
      
      if (existingTransactions.length > 0) {
        // Update existing pending transaction
        const existingTransaction = existingTransactions[0];
        debtId = existingTransaction.debt_id || debtId;
        userId = existingTransaction.user_id;
        
        await connection.execute(
          `UPDATE transactions 
           SET status = 'completed', 
               reference_number = ?,
               transaction_date = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [paymentId || transactionRef, new Date().toISOString().split('T')[0], existingTransaction.id]
        );
      } else if (debtId) {
        // Create new transaction if we have debt_id
        // First get user_id from debt
        const [debtDetails] = await connection.execute(
          'SELECT user_id, debtor_name, amount FROM debts WHERE id = ?',
          [debtId]
        );
        
        if (debtDetails.length > 0) {
          userId = debtDetails[0].user_id;
          
          await connection.execute(
            `INSERT INTO transactions 
             (user_id, debt_id, type, amount, payment_method, description, transaction_date, status, reference_number, created_at)
             VALUES (?, ?, 'pay', ?, 'kcb', ?, ?, 'completed', ?, NOW())`,
            [
              userId,
              debtId,
              paymentAmount,
              `KCB payment from ${debtDetails[0].debtor_name}`,
              new Date().toISOString().split('T')[0],
              paymentId || transactionRef
            ]
          );
        }
      } else {
        // Try to find debt by phone number and amount as fallback
        const [debts] = await connection.execute(
          `SELECT d.id, d.user_id, d.debtor_name, d.amount 
           FROM debts d
           WHERE d.debtor_phone LIKE ? 
           AND ABS(d.amount - ?) < 1
           AND d.status != 'paid'
           ORDER BY d.created_at DESC
           LIMIT 1`,
          [`%${phoneNumber?.slice(-9) || ''}%`, paymentAmount]
        );
        
        if (debts.length > 0) {
          debtId = debts[0].id;
          userId = debts[0].user_id;
          
          await connection.execute(
            `INSERT INTO transactions 
             (user_id, debt_id, type, amount, payment_method, description, transaction_date, status, reference_number, created_at)
             VALUES (?, ?, 'pay', ?, 'kcb', ?, ?, 'completed', ?, NOW())`,
            [
              userId,
              debtId,
              paymentAmount,
              `KCB payment from ${debts[0].debtor_name}`,
              new Date().toISOString().split('T')[0],
              paymentId || transactionRef
            ]
          );
        }
      }
      
      console.log('KCB Payment Successful:', {
        transactionRef,
        paymentId,
        amount: paymentAmount,
        phoneNumber,
        accountReference,
        debtId,
        userId,
        status
      });
      
      // Update debt status if payment exists
      if (debtId && userId) {
        try {
          // Get current debt amount
          const [debtDetails] = await connection.execute(
            'SELECT amount, debtor_name FROM debts WHERE id = ? AND user_id = ?',
            [debtId, userId]
          );
          
          if (debtDetails.length > 0) {
            const totalDebtAmount = parseFloat(debtDetails[0].amount);
            
            // Get total payments for this debt
            const [totalPayments] = await connection.execute(
              'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE debt_id = ? AND status = ?',
              [debtId, 'completed']
            );
            
            const totalPaid = parseFloat(totalPayments[0].total);
            
            if (totalPaid >= totalDebtAmount) {
              // Debt is fully paid
              await connection.execute(
                'UPDATE debts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                ['paid', debtId, userId]
              );
              
              // Send notification
              await notificationService.createNotification(
                userId,
                'system',
                'Debt Fully Paid via KCB',
                `Debt from ${debtDetails[0].debtor_name} has been fully settled with KCB payment of Ksh ${paymentAmount.toLocaleString()}`,
                debtId,
                'debt'
              );
            } else {
              // Partial payment
              const remainingAmount = totalDebtAmount - totalPaid;
              await notificationService.createNotification(
                userId,
                'system',
                'KCB Payment Received',
                `KCB payment of Ksh ${paymentAmount.toLocaleString()} received from ${debtDetails[0].debtor_name}. Remaining: Ksh ${remainingAmount.toLocaleString()}`,
                debtId,
                'debt'
              );
            }
            
            // Send email alert
            await emailAlertService.sendTransactionAlert(userId, {
              type: 'payment_received',
              amount: paymentAmount,
              debtorName: debtDetails[0].debtor_name,
              description: `KCB payment - Transaction: ${transactionRef}`
            });
          }
        } catch (updateError) {
          console.error('Error updating debt status:', updateError);
          // Don't fail the callback if update fails
        }
      }
      
      res.status(200).json({ success: true, message: 'Payment processed successfully' });
    } else {
      // Payment failed
      console.log('KCB Payment Failed:', {
        transactionRef,
        paymentId,
        status
      });
      
      // Update any pending transactions with failed status
      try {
        const connection = await db;
        if (transactionRef) {
          await connection.execute(
            `UPDATE transactions 
             SET status = 'failed', 
                 description = CONCAT(COALESCE(description, ''), ' - KCB Error: ', ?),
                 updated_at = CURRENT_TIMESTAMP
             WHERE reference_number = ? AND payment_method = ? AND status = ?`,
            [status, transactionRef, 'kcb', 'pending']
          );
        }
      } catch (updateError) {
        console.error('Error updating failed transaction:', updateError);
      }
      
      res.status(200).json({ success: false, message: 'Payment failed', status: status });
    }
  } catch (error) {
    console.error('Error processing KCB callback:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Timeout endpoint for KCB
router.post('/timeout', (req, res) => {
  console.log('KCB timeout callback received:', req.body);
  res.status(200).json({ success: true, message: 'Timeout callback received' });
});

module.exports = router;


// Dev helper to mark pending KCB transaction as completed (testing only)
router.post('/dev-complete', async (req, res) => {
  try {
    if (!KCB_CONFIG.isDevelopment) {
      return res.status(403).json({ error: 'Dev helper not available in production' });
    }

    const { transactionRef, paymentId } = req.body;
    if (!transactionRef && !paymentId) {
      return res.status(400).json({ error: 'transactionRef or paymentId is required' });
    }

    const ref = transactionRef || paymentId;
    const connection = await db;

    // Find existing pending KCB transaction
    const [pendingRows] = await connection.execute(
      'SELECT * FROM transactions WHERE reference_number = ? AND payment_method = ? AND status = ?',
      [ref, 'kcb', 'pending']
    );

    if (pendingRows.length === 0) {
      return res.status(404).json({ error: 'Pending KCB transaction not found', reference: ref });
    }

    const tx = pendingRows[0];

    // Mark as completed
    await connection.execute(
      `UPDATE transactions 
       SET status = 'completed',
           reference_number = ?,
           transaction_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [paymentId || transactionRef, new Date().toISOString().split('T')[0], tx.id]
    );

    // Update debt status and send notifications like real callback
    if (tx.debt_id && tx.user_id) {
      try {
        const [debtDetails] = await connection.execute(
          'SELECT amount, debtor_name FROM debts WHERE id = ? AND user_id = ?',
          [tx.debt_id, tx.user_id]
        );

        if (debtDetails.length > 0) {
          const totalDebtAmount = parseFloat(debtDetails[0].amount);
          const [totalPayments] = await connection.execute(
            'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE debt_id = ? AND status = ?',
            [tx.debt_id, 'completed']
          );

          const totalPaid = parseFloat(totalPayments[0].total);

          if (totalPaid >= totalDebtAmount) {
            await connection.execute(
              'UPDATE debts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
              ['paid', tx.debt_id, tx.user_id]
            );

            await notificationService.createNotification(
              tx.user_id,
              'system',
              'Debt Fully Paid via KCB (Dev)',
              `Debt from ${debtDetails[0].debtor_name} fully settled (dev helper).`,
              tx.debt_id,
              'debt'
            );
          } else {
            const remainingAmount = totalDebtAmount - totalPaid;
            await notificationService.createNotification(
              tx.user_id,
              'system',
              'KCB Payment Marked Completed (Dev)',
              `Dev helper marked KCB payment of Ksh ${parseFloat(tx.amount).toLocaleString()} completed. Remaining: Ksh ${remainingAmount.toLocaleString()}`,
              tx.debt_id,
              'debt'
            );
          }

          await emailAlertService.sendTransactionAlert(tx.user_id, {
            type: 'payment_received',
            amount: parseFloat(tx.amount),
            debtorName: debtDetails[0].debtor_name,
            description: `Dev helper: KCB payment - Transaction: ${transactionRef || paymentId}`
          });
        }
      } catch (e) {
        console.error('Dev helper: error updating debt status', e);
      }
    }

    res.json({
      success: true,
      message: 'Pending KCB transaction marked completed (dev helper)',
      transactionId: tx.id,
      reference_number: paymentId || transactionRef
    });
  } catch (error) {
    console.error('Dev helper: failed to complete KCB transaction', error);
    res.status(500).json({ error: 'Failed to mark transaction completed (dev helper)' });
  }
});

