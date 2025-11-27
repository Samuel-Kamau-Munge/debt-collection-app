const http = require('http');

// Test debt recording functionality
const testDebtRecording = () => {
  console.log('Testing debt recording functionality...');
  
  // Test data for recording a debt
  const debtData = {
    debtor_name: 'John Doe',
    debtor_email: 'john@example.com',
    debtor_phone: '+254700000000',
    amount: 50000,
    category: 'business',
    description: 'Test debt recording',
    due_date: '2024-03-15',
    reference_number: 'TEST-001',
    interest_rate: 5.0,
    payment_terms: 'lump_sum',
    notes: 'Test debt for functionality verification'
  };
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/debts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // This will fail auth, but we can see if endpoint exists
    }
  };

  const req = http.request(options, (res) => {
    console.log(`\n1. Debt Recording API Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 401) {
        console.log('✅ Debt recording API endpoint exists (401 expected without valid auth)');
        console.log('💡 User needs to login to record debts');
      } else if (res.statusCode === 201) {
        console.log('✅ Debt recorded successfully!');
        console.log('📊 Response:', data);
      } else if (res.statusCode === 404) {
        console.log('❌ Debt recording API endpoint not found');
        console.log('💡 Check if debt routes are properly mounted');
      } else {
        console.log(`⚠️ Unexpected status code: ${res.statusCode}`);
        console.log('📊 Response:', data);
      }
      
      // Test if the form loads properly
      console.log('\n2. Testing Record New Debt page...');
      const pageOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/dashboard.html',
        method: 'GET'
      };
      
      const pageReq = http.request(pageOptions, (pageRes) => {
        console.log(`Dashboard page status: ${pageRes.statusCode}`);
        if (pageRes.statusCode === 200) {
          console.log('✅ Dashboard page is accessible');
          console.log('💡 User can access the debt recording form');
        } else {
          console.log('❌ Dashboard page not accessible');
        }
      });
      
      pageReq.on('error', (error) => {
        console.log('❌ Dashboard page test failed:', error.message);
      });
      
      pageReq.end();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Server connection failed:', error.message);
    console.log('💡 Start the server with: node server.js');
  });

  // Send the debt data
  req.write(JSON.stringify(debtData));
  req.end();
};

testDebtRecording();
