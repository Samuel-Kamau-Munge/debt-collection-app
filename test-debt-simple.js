const express = require('express');
const debtRoutes = require('./routes/debts');

console.log('Testing debt routes...');
console.log('Debt routes type:', typeof debtRoutes);
console.log('Debt routes:', debtRoutes);

// Test if we can create a simple server with debt routes
const app = express();
app.use(express.json());

try {
  app.use('/api/debts', debtRoutes);
  console.log('✅ Debt routes mounted successfully');
  
  // Test the routes
  const routes = debtRoutes.stack || [];
  console.log('Number of routes:', routes.length);
  
  if (routes.length > 0) {
    console.log('✅ Routes are available');
    console.log('First route:', routes[0]);
  } else {
    console.log('❌ No routes found');
  }
  
} catch (error) {
  console.log('❌ Error mounting debt routes:', error.message);
}
