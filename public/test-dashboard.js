// Test version of dashboard.js with authentication bypassed
console.log('🔧 Loading test dashboard.js...');

// Simple test functions
window.logout = function() {
  console.log('🚪 Logout function called');
  alert('Logout function works!');
};

window.exportDebts = function() {
  console.log('📊 Export debts function called');
  alert('Export debts function works!');
};

window.clearFilters = function() {
  console.log('🔍 Clear filters function called');
  alert('Clear filters function works!');
};

window.refreshDebts = function() {
  console.log('🔄 Refresh debts function called');
  alert('Refresh debts function works!');
};

window.addDebt = function() {
  console.log('➕ Add debt function called');
  alert('Add debt function works!');
};

window.editDebt = function(id) {
  console.log('✏️ Edit debt function called with ID:', id);
  alert('Edit debt function works!');
};

window.deleteDebt = function(id) {
  console.log('🗑️ Delete debt function called with ID:', id);
  alert('Delete debt function works!');
};

window.viewDebt = function(id) {
  console.log('👁️ View debt function called with ID:', id);
  alert('View debt function works!');
};

window.recordPayment = function(id) {
  console.log('💰 Record payment function called with ID:', id);
  alert('Record payment function works!');
};

window.addCredit = function() {
  console.log('➕ Add credit function called');
  alert('Add credit function works!');
};

window.editCredit = function(id) {
  console.log('✏️ Edit credit function called with ID:', id);
  alert('Edit credit function works!');
};

window.deleteCredit = function(id) {
  console.log('🗑️ Delete credit function called with ID:', id);
  alert('Delete credit function works!');
};

window.viewCredit = function(id) {
  console.log('👁️ View credit function called with ID:', id);
  alert('View credit function works!');
};

window.recordCreditPayment = function(id) {
  console.log('💰 Record credit payment function called with ID:', id);
  alert('Record credit payment function works!');
};

// Navigation functions
window.goToRecordDebt = function() {
  console.log('🧭 Go to record debt');
  alert('Go to record debt works!');
};

window.goToViewDebts = function() {
  console.log('🧭 Go to view debts');
  alert('Go to view debts works!');
};

window.goToRecordCredit = function() {
  console.log('🧭 Go to record credit');
  alert('Go to record credit works!');
};

window.goToViewCredits = function() {
  console.log('🧭 Go to view credits');
  alert('Go to view credits works!');
};

window.goToTransactionHistory = function() {
  console.log('🧭 Go to transaction history');
  alert('Go to transaction history works!');
};

window.goToAnalytics = function() {
  console.log('🧭 Go to analytics');
  alert('Go to analytics works!');
};

window.goToReports = function() {
  console.log('🧭 Go to reports');
  alert('Go to reports works!');
};

// Pagination functions
window.previousPage = function() {
  console.log('⬅️ Previous page');
  alert('Previous page works!');
};

window.nextPage = function() {
  console.log('➡️ Next page');
  alert('Next page works!');
};

// Export functions
window.exportCredits = function() {
  console.log('📊 Export credits');
  alert('Export credits works!');
};

window.refreshCredits = function() {
  console.log('🔄 Refresh credits');
  alert('Refresh credits works!');
};

// Statistics functions
window.showDebtStats = function() {
  console.log('📊 Show debt stats');
  alert('Show debt stats works!');
};

window.showCreditStats = function() {
  console.log('📊 Show credit stats');
  alert('Show credit stats works!');
};

window.showTransactionStats = function() {
  console.log('📊 Show transaction stats');
  alert('Show transaction stats works!');
};

// Search functions
window.searchDebts = function() {
  console.log('🔍 Search debts');
  alert('Search debts works!');
};

window.searchCredits = function() {
  console.log('🔍 Search credits');
  alert('Search credits works!');
};

// Alert function
window.dismissAlert = function(alertId) {
  console.log('🔔 Dismiss alert:', alertId);
  alert('Dismiss alert works!');
};

console.log('✅ All test functions loaded successfully!');

// Setup sidebar navigation
function setupSidebarNavigation() {
  console.log('🔧 Setting up sidebar navigation...');

  // Add click event listeners to all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🔗 Nav link clicked:', this.id, 'data-module:', this.getAttribute('data-module'));

      // Remove active class from all nav links
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

      // Add active class to clicked link
      this.classList.add('active');

      // Show alert for navigation (since we don't have full module loading in test)
      const moduleName = this.getAttribute('data-module') || this.textContent;
      alert(`Navigation to ${moduleName} clicked!`);
    });
  });

  console.log('✅ Sidebar navigation setup complete');
}

// Test if functions are available
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 DOM Content Loaded - Testing functions...');

  const functions = [
    'logout', 'exportDebts', 'clearFilters', 'refreshDebts',
    'addDebt', 'editDebt', 'deleteDebt', 'viewDebt', 'recordPayment',
    'addCredit', 'editCredit', 'deleteCredit', 'viewCredit', 'recordCreditPayment',
    'goToRecordDebt', 'goToViewDebts', 'goToRecordCredit', 'goToViewCredits',
    'goToTransactionHistory', 'goToAnalytics', 'goToReports',
    'previousPage', 'nextPage', 'exportCredits', 'refreshCredits',
    'showDebtStats', 'showCreditStats', 'showTransactionStats',
    'searchDebts', 'searchCredits', 'dismissAlert'
  ];

  let allFunctionsExist = true;
  functions.forEach(func => {
    if (typeof window[func] !== 'function') {
      console.error(`❌ Function ${func} is missing!`);
      allFunctionsExist = false;
    } else {
      console.log(`✅ Function ${func} exists`);
    }
  });

  if (allFunctionsExist) {
    console.log('🎉 All functions are available!');
  } else {
    console.log('❌ Some functions are missing!');
  }

  // Setup sidebar navigation
  setupSidebarNavigation();
});



