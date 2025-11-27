// Quick test to verify debt recording works
const http = require('http');

console.log('Testing debt recording...');

// Test if server is running
const testServer = () => {
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/debts',
    method: 'GET'
  }, (res) => {
    console.log(`Server response: ${res.statusCode}`);
    if (res.statusCode === 401) {
      console.log('✅ Server is running and debt API exists (401 = auth required)');
    } else if (res.statusCode === 404) {
      console.log('❌ Debt API not found - server issue');
    } else {
      console.log(`⚠️ Unexpected status: ${res.statusCode}`);
    }
  });
  
  req.on('error', (err) => {
    console.log('❌ Server not running:', err.message);
    console.log('💡 Start server with: node server.js');
  });
  
  req.end();
};

testServer();
