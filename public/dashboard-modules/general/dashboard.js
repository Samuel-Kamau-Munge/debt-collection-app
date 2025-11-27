class DashboardController {
  constructor() {
    this.currentModule = null;
    this.alerts = [];
    this.alertCount = 0;

    // Load alerts from localStorage
    this.loadAlerts();

    const mainContent = document.querySelector('main');
    if (mainContent) {
      // Load analytics page as default
      this.loadModule('overview/analytics');
      this.setActiveNavLinkByModule('overview/analytics');

      // Update alert display
      this.updateAlertDisplay();
    }
  }

  async loadModuleScript(modulePath) {
    try {
      const scriptPath = `/dashboard-modules/${modulePath}/script.js`;
      console.log(`[Dashboard] Fetching script: ${scriptPath}`);
      // Add cache-busting timestamp
      const response = await fetch(scriptPath + `?v=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const scriptContent = await response.text();
        console.log(`[Dashboard] Script content length: ${scriptContent.length} chars`);
        
        // Remove existing script if it exists
        const existingScript = document.querySelector(`script[data-module="${modulePath}"]`);
        if (existingScript) {
          console.log(`[Dashboard] Removing existing script for ${modulePath}`);
          existingScript.remove();
        }
        
        // Create and inject new script
        const script = document.createElement('script');
        script.setAttribute('data-module', modulePath);
        script.textContent = scriptContent;
        
        // Add error handler
        script.onerror = (e) => {
          console.error(`[Dashboard] Script execution error for ${modulePath}:`, e);
        };
        
        // Add load handler
        script.onload = () => {
          console.log(`[Dashboard] Script loaded successfully for ${modulePath}`);
        };
        
        document.head.appendChild(script);
        
        console.log(`✅ Loaded script for module: ${modulePath}`);
      } else {
        console.error(`⚠️ Failed to load script for module ${modulePath}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[Dashboard] Error loading script for module ${modulePath}:`, error);
    }
  }

  async loadModuleStyles(modulePath) {
    try {
      const stylePath = `/dashboard-modules/${modulePath}/styles.css`;
      const response = await fetch(stylePath, { cache: 'no-store' });
      if (response.ok) {
        // Remove existing link for this module
        const existingLink = document.querySelector(`link[data-module-style="${modulePath}"]`);
        if (existingLink) existingLink.remove();

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = stylePath + `?v=${Date.now()}`; // cache-bust
        link.setAttribute('data-module-style', modulePath);
        document.head.appendChild(link);
        console.log(`✅ Loaded styles for module: ${modulePath}`);
      } else {
        console.log(`⚠️ No styles file found for module: ${modulePath}`);
      }
    } catch (error) {
      console.error(`Error loading styles for module ${modulePath}:`, error);
    }
  }

  setActiveNavLink(link) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  }

  setActiveNavLinkByModule(modulePath) {
    const link = document.querySelector(`[data-module="${modulePath}"]`);
    if (link) {
      this.setActiveNavLink(link);
    }
  }

  async loadModule(modulePath) {
    try {
      console.log(`[Dashboard] Loading module: ${modulePath}`);
      this.currentModule = modulePath;

      // Load module content (HTML)
      await this.loadModuleContent(modulePath);

      // Load module styles
      await this.loadModuleStyles(modulePath);

      // Load module script
      await this.loadModuleScript(modulePath);

      console.log(`✅ Module loaded successfully: ${modulePath}`);
    } catch (error) {
      console.error(`[Dashboard] Error loading module ${modulePath}:`, error);
    }
  }

  async loadModuleContent(modulePath) {
    try {
      const htmlPath = `/dashboard-modules/${modulePath}/index.html`;
      console.log(`[Dashboard] Fetching HTML: ${htmlPath}`);

      const response = await fetch(htmlPath + `?v=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const htmlContent = await response.text();
        console.log(`[Dashboard] HTML content length: ${htmlContent.length} chars`);

        // Update the main content area
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.innerHTML = htmlContent;
          console.log(`✅ Module content loaded for: ${modulePath}`);
        } else {
          console.error(`[Dashboard] Main content element not found`);
        }
      } else {
        console.error(`⚠️ Failed to load HTML for module ${modulePath}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[Dashboard] Error loading module content for ${modulePath}:`, error);
    }
  }

  async loadWelcomePageData() {
    try {
      console.log('[Dashboard] Loading welcome page data...');

      // Load debt statistics
      const debts = getStoredDebts();
      const totalDebts = debts.length;
      const totalAmount = debts.reduce((sum, debt) => sum + parseFloat(debt.amount || 0), 0);
      const overdueCount = debts.filter(debt => debt.status === 'overdue').length;
      const paidCount = debts.filter(debt => debt.status === 'paid').length;

      // Update debt stats
      const totalDebtsEl = document.getElementById('total-debts-count');
      const totalAmountEl = document.getElementById('total-debts-amount');
      const overdueEl = document.getElementById('overdue-debts-count');
      const paidEl = document.getElementById('paid-debts-count');

      if (totalDebtsEl) totalDebtsEl.textContent = totalDebts;
      if (totalAmountEl) totalAmountEl.textContent = `Ksh ${totalAmount.toLocaleString()}`;
      if (overdueEl) overdueEl.textContent = overdueCount;
      if (paidEl) paidEl.textContent = paidCount;

      // Load credit statistics
      const credits = getStoredCredits();
      const totalCredits = credits.length;
      const totalCreditsAmount = credits.reduce((sum, credit) => sum + parseFloat(credit.amount || 0), 0);
      const activeCredits = credits.filter(credit => credit.status === 'active').length;

      // Update credit stats
      const totalCreditsEl = document.getElementById('total-credits-count');
      const totalCreditsAmountEl = document.getElementById('total-credits-used');
      const totalCreditsLimitEl = document.getElementById('total-credits-limit');
      const activeCreditsEl = document.getElementById('active-credits-count');

      if (totalCreditsEl) totalCreditsEl.textContent = totalCredits;
      if (totalCreditsAmountEl) totalCreditsAmountEl.textContent = `Ksh ${totalCreditsAmount.toLocaleString()}`;
      if (totalCreditsLimitEl) totalCreditsLimitEl.textContent = `Ksh ${totalCreditsAmount.toLocaleString()}`;
      if (activeCreditsEl) activeCreditsEl.textContent = activeCredits;

      // Create alerts for overdue debts
      this.createOverdueAlerts(debts);

      console.log('[Dashboard] Welcome page data loaded successfully');
    } catch (error) {
      console.error('[Dashboard] Error loading welcome page data:', error);
    }
  }

  // Alert Management Methods
  loadAlerts() {
    try {
      const stored = localStorage.getItem('debtManagerAlerts');
      if (stored) {
        this.alerts = JSON.parse(stored);
        // Filter out dismissed alerts and update count
        this.alerts = this.alerts.filter(alert => !alert.dismissed);
        this.alertCount = this.alerts.length;
      } else {
        this.alerts = [];
        this.alertCount = 0;
      }
      console.log(`⚠️ Loaded ${this.alertCount} alerts`);
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.alerts = [];
      this.alertCount = 0;
    }
  }

  storeAlerts() {
    try {
      localStorage.setItem('debtManagerAlerts', JSON.stringify(this.alerts));
      console.log(`⚠️ Stored ${this.alerts.length} alerts`);
    } catch (error) {
      console.error('Error storing alerts:', error);
    }
  }

  createAlert(type, title, message, priority = 'medium', id = null) {
    const alert = {
      id: id || `${type}-${Date.now()}`,
      type: type,
      priority: priority,
      title: title,
      message: message,
      timestamp: new Date(),
      dismissed: false
    };

    this.alerts.unshift(alert);
    this.alertCount++;
    this.storeAlerts();
    this.updateAlertDisplay();

    console.log(`⚠️ Created alert: ${title}`);
    return alert;
  }

  updateAlertDisplay() {
    const alertCountEl = document.getElementById('alert-count');
    const alertsDropdown = document.getElementById('alerts-dropdown');

    if (alertCountEl) {
      alertCountEl.textContent = this.alertCount;
      alertCountEl.style.display = this.alertCount > 0 ? 'inline' : 'none';
    }

    if (alertsDropdown) {
      if (this.alerts.length === 0) {
        alertsDropdown.innerHTML = '<p>No alerts</p>';
      } else {
        const alertsHTML = this.alerts.slice(0, 10).map(alert => `
          <div class="alert-item ${alert.priority}" onclick="handleAlertClick('${alert.id}', '${alert.type}')">
            <div class="alert-header">
              <div class="alert-icon ${alert.priority}">${this.getAlertIcon(alert.type)}</div>
              <div class="alert-title">${alert.title}</div>
              <div class="alert-time">${this.formatTimeAgo(alert.timestamp)}</div>
            </div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-actions">
              <button class="alert-action-btn" onclick="event.stopPropagation(); dismissAlert('${alert.id}')">✕</button>
            </div>
          </div>
        `).join('');

        alertsDropdown.innerHTML = alertsHTML;
      }
    }
  }

  getAlertIcon(type) {
    switch (type) {
      case 'debt_created': return '💳';
      case 'credit_created': return '💰';
      case 'payment_received': return '💸';
      case 'credit_payment_made': return '💳';
      case 'overdue_debt': return '⚠️';
      case 'overdue_credit': return '⚠️';
      default: return 'ℹ️';
    }
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  dismissAlert(alertId) {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      this.alerts[alertIndex].dismissed = true;
      this.alertCount = this.alerts.filter(alert => !alert.dismissed).length;
      this.storeAlerts();
      this.updateAlertDisplay();
      console.log(`⚠️ Alert dismissed: ${alertId}`);
    }
  }

  createOverdueAlerts(debts) {
    try {
      console.log('⚠️ Checking for overdue debts to create alerts...');
      const now = new Date();
      let alertCount = 0;

      debts.forEach(debt => {
        if (debt.status === 'overdue') {
          const alertId = `overdue-debt-${debt.id}`;
          // Check if alert already exists
          const existingAlert = this.alerts.find(alert => alert.id === alertId);
          if (!existingAlert) {
            this.createAlert(
              'overdue_debt',
              'Overdue Debt Alert',
              `Debt of Ksh ${parseFloat(debt.amount).toLocaleString()} from ${debt.debtor_name} is overdue`,
              'high',
              alertId
            );
            alertCount++;
          }
        }
      });

      console.log(`⚠️ Created ${alertCount} overdue debt alerts`);
    } catch (error) {
      console.error('Error creating overdue alerts:', error);
    }
  }
}

// Global functions for module communication
window.logout = function() {
  console.log('🚪 Logging out user...');
  
  // Clear all authentication tokens
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  
  // Clear any user-specific data
  localStorage.removeItem('userProfile');
  localStorage.removeItem('userPreferences');
  
  // Clear any cached data
  localStorage.removeItem('debtManagerDebts');
  localStorage.removeItem('debtManagerCredits');
  localStorage.removeItem('debtManagerPayments');
  localStorage.removeItem('debtManagerCreditPayments');
  localStorage.removeItem('debtManagerAlerts');
  
  // Show logout confirmation
  alert('You have been logged out successfully.');
  
  // Redirect to login page
  window.location.href = '/login';
};

// Missing functions that buttons are trying to call
window.exportDebts = function() {
  console.log('📊 Export debts function called');
  exportDebtsToCSV();
};

window.clearFilters = function() {
  console.log('🔍 Clear filters function called');
  clearDebtFilters();
};

window.refreshDebts = function() {
  console.log('🔄 Refresh debts function called');
  refreshDebtsList();
};

// Add other common missing functions
window.addDebt = function() {
  console.log('➕ Add debt function called');
  showAddDebtModal();
};

window.editDebt = function(id) {
  console.log('✏️ Edit debt function called for ID:', id);
  showEditDebtModal(id);
};

window.deleteDebt = function(id) {
  console.log('🗑️ Delete debt function called for ID:', id);
  confirmDeleteDebt(id);
};

window.viewDebt = function(id) {
  console.log('👁️ View debt function called for ID:', id);
  showDebtDetails(id);
};

window.recordPayment = function(id) {
  console.log('💰 Record payment function called for ID:', id);
  showRecordPaymentModal(id);
};

// Credit Management Functions
window.addCredit = function() {
  console.log('➕ Add credit function called');
  showAddCreditModal();
};

window.editCredit = function(id) {
  console.log('✏️ Edit credit function called for ID:', id);
  showEditCreditModal(id);
};

window.deleteCredit = function(id) {
  console.log('🗑️ Delete credit function called for ID:', id);
  confirmDeleteCredit(id);
};

window.viewCredit = function(id) {
  console.log('👁️ View credit function called for ID:', id);
  showCreditDetails(id);
};

window.recordCreditPayment = function(id) {
  console.log('💰 Record credit payment function called for ID:', id);
  showRecordCreditPaymentModal(id);
};

// Navigation Functions
window.goToRecordDebt = function() {
  console.log('🧭 Navigating to Record Debt');
  if (window.dashboardController) {
    window.dashboardController.loadModule('debt-management/record-debt');
    window.dashboardController.setActiveNavLinkByModule('debt-management/record-debt');
  }
};

window.goToViewDebts = function() {
  console.log('🧭 Navigating to Payment Schedule');
  if (window.dashboardController) {
    window.dashboardController.loadModule('debt-management/payment-schedule');
    window.dashboardController.setActiveNavLinkByModule('debt-management/payment-schedule');
  }
};

window.goToRecordCredit = function() {
  console.log('🧭 Navigating to Record Credit');
  if (window.dashboardController) {
    window.dashboardController.loadModule('credit-management/record-credit');
    window.dashboardController.setActiveNavLinkByModule('credit-management/record-credit');
  }
};

window.goToViewCredits = function() {
  console.log('🧭 Navigating to View Credits');
  if (window.dashboardController) {
    window.dashboardController.loadModule('credit-management/view-credits');
    window.dashboardController.setActiveNavLinkByModule('credit-management/view-credits');
  }
};

window.goToTransactionHistory = function() {
  console.log('🧭 Transaction History module removed. Redirecting to Pending Transactions');
  if (window.dashboardController) {
    window.dashboardController.loadModule('transaction-management/pending-transactions');
    window.dashboardController.setActiveNavLinkByModule('transaction-management/pending-transactions');
  }
};

window.goToAnalytics = function() {
  console.log('🧭 Navigating to Analytics');
  if (window.dashboardController) {
    window.dashboardController.loadModule('overview/analytics');
    window.dashboardController.setActiveNavLinkByModule('overview/analytics');
  }
};

window.goToReports = function() {
  console.log('🧭 Reports module removed. Redirecting to Analytics');
  if (window.dashboardController) {
    window.dashboardController.loadModule('overview/analytics');
    window.dashboardController.setActiveNavLinkByModule('overview/analytics');
  }
};

// Pagination Functions
window.previousPage = function() {
  console.log('📄 Previous page clicked');
  const currentPage = parseInt(document.getElementById('page-info')?.textContent?.match(/Page (\d+)/)?.[1] || '1');
  if (currentPage > 1) {
    loadPage(currentPage - 1);
  }
};

window.nextPage = function() {
  console.log('📄 Next page clicked');
  const currentPage = parseInt(document.getElementById('page-info')?.textContent?.match(/Page (\d+)/)?.[1] || '1');
  const totalPages = parseInt(document.getElementById('page-info')?.textContent?.match(/of (\d+)/)?.[1] || '1');
  if (currentPage < totalPages) {
    loadPage(currentPage + 1);
  }
};

function loadPage(pageNumber) {
  console.log('📄 Loading page:', pageNumber);
  // This would load the appropriate page of data
  // For now, just update the page info
  const pageInfo = document.getElementById('page-info');
  if (pageInfo) {
    pageInfo.textContent = `Page ${pageNumber} of 1`;
  }
}

// Credit Export Function
window.exportCredits = function() {
  console.log('📊 Export credits function called');
  exportCreditsToCSV();
};

function exportCreditsToCSV() {
  try {
    const credits = getStoredCredits();
    if (credits.length === 0) {
      alert('No credits to export');
      return;
    }

    // Create CSV content
    let csvContent = 'Creditor Name,Amount,Due Date,Status,Created Date,Description\n';
    credits.forEach(credit => {
      csvContent += `"${credit.creditor_name}","${credit.amount}","${credit.due_date}","${credit.status}","${credit.created_at}","${credit.description || ''}"\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `credits_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`✅ Exported ${credits.length} credits successfully!`);
  } catch (error) {
    console.error('Export credits error:', error);
    alert('❌ Error exporting credits');
  }
}

// Credit Refresh Function
window.refreshCredits = function() {
  console.log('🔄 Refresh credits function called');
  refreshCreditsList();
};

function refreshCreditsList() {
  try {
    const credits = getStoredCredits();
    displayCredits(credits);
    alert(`✅ Refreshed! Found ${credits.length} credits`);
  } catch (error) {
    console.error('Refresh credits error:', error);
    alert('❌ Error refreshing credits');
  }
}

function displayCredits(credits) {
  // This would update the UI to show the credits
  console.log('Displaying credits:', credits.length);
}

// Additional Utility Functions
window.showDebtStats = function() {
  console.log('📊 Showing debt statistics');
  const debts = getStoredDebts();
  const totalDebts = debts.length;
  const totalAmount = debts.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
  const overdueCount = debts.filter(debt => debt.status === 'overdue').length;
  const paidCount = debts.filter(debt => debt.status === 'paid').length;
  
  alert(`📊 Debt Statistics:\n\nTotal Debts: ${totalDebts}\nTotal Amount: Ksh ${totalAmount.toLocaleString()}\nOverdue: ${overdueCount}\nPaid: ${paidCount}`);
};

window.showCreditStats = function() {
  console.log('📊 Showing credit statistics');
  const credits = getStoredCredits();
  const totalCredits = credits.length;
  const totalAmount = credits.reduce((sum, credit) => sum + parseFloat(credit.amount), 0);
  const overdueCount = credits.filter(credit => credit.status === 'overdue').length;
  const paidCount = credits.filter(credit => credit.status === 'paid').length;
  
  alert(`📊 Credit Statistics:\n\nTotal Credits: ${totalCredits}\nTotal Amount: Ksh ${totalAmount.toLocaleString()}\nOverdue: ${overdueCount}\nPaid: ${paidCount}`);
};

window.showTransactionStats = function() {
  console.log('📊 Showing transaction statistics');
  const payments = getStoredPayments();
  const creditPayments = getStoredCreditPayments();
  const totalTransactions = payments.length + creditPayments.length;
  const totalPayments = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  
  alert(`📊 Transaction Statistics:\n\nTotal Transactions: ${totalTransactions}\nDebt Payments: Ksh ${totalPayments.toLocaleString()}\nCredit Payments: Ksh ${totalCreditPayments.toLocaleString()}`);
};

// Enhanced Clear Filters Function
function clearDebtFilters() {
  try {
    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    // Clear status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) statusFilter.value = '';
    
    // Clear category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';
    
    // Clear type filter
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) typeFilter.value = '';

    // Refresh the appropriate list
    const module = window.dashboardController?.currentModule;
    if (module?.includes('debt')) {
      refreshDebtsList();
    } else if (module?.includes('credit')) {
      refreshCreditsList();
    }
    
    alert('✅ Filters cleared successfully!');
    } catch (error) {
    console.error('Clear filters error:', error);
    alert('❌ Error clearing filters');
  }
}

// Search and Filter Functions
window.searchDebts = function() {
  console.log('🔍 Searching debts');
  const searchTerm = document.getElementById('search-input')?.value || '';
  const statusFilter = document.getElementById('status-filter')?.value || '';
  const categoryFilter = document.getElementById('category-filter')?.value || '';
  
  const debts = getStoredDebts();
  let filteredDebts = debts;
  
  if (searchTerm) {
    filteredDebts = filteredDebts.filter(debt => 
      debt.debtor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  if (statusFilter) {
    filteredDebts = filteredDebts.filter(debt => debt.status === statusFilter);
  }
  
  if (categoryFilter) {
    filteredDebts = filteredDebts.filter(debt => debt.category === categoryFilter);
  }
  
  displayDebts(filteredDebts);
  console.log(`🔍 Found ${filteredDebts.length} debts matching criteria`);
};

window.searchCredits = function() {
  console.log('🔍 Searching credits');
  const searchTerm = document.getElementById('search-input')?.value || '';
  const typeFilter = document.getElementById('type-filter')?.value || '';
  const statusFilter = document.getElementById('status-filter')?.value || '';
  
  const credits = getStoredCredits();
  let filteredCredits = credits;
  
  if (searchTerm) {
    filteredCredits = filteredCredits.filter(credit => 
      credit.creditor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  if (typeFilter) {
    filteredCredits = filteredCredits.filter(credit => credit.type === typeFilter);
  }
  
  if (statusFilter) {
    filteredCredits = filteredCredits.filter(credit => credit.status === statusFilter);
  }
  
  displayCredits(filteredCredits);
  console.log(`🔍 Found ${filteredCredits.length} credits matching criteria`);
};

// Debt Management Functions
function exportDebtsToCSV() {
  try {
    const debts = getStoredDebts();
    if (debts.length === 0) {
      alert('No debts to export');
      return;
    }

    // Create CSV content
    let csvContent = 'Debtor Name,Amount,Due Date,Status,Created Date,Description\n';
    debts.forEach(debt => {
      csvContent += `"${debt.debtor_name}","${debt.amount}","${debt.due_date}","${debt.status}","${debt.created_at}","${debt.description || ''}"\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `debts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`✅ Exported ${debts.length} debts successfully!`);
  } catch (error) {
    console.error('Export error:', error);
    alert('❌ Error exporting debts');
  }
}

function clearDebtFilters() {
  try {
    // Clear any active filters
    const filterInputs = document.querySelectorAll('input[type="text"], input[type="date"], select');
    filterInputs.forEach(input => {
      if (input.name && (input.name.includes('filter') || input.name.includes('search'))) {
        input.value = '';
      }
    });

    // Refresh the debt list
    refreshDebtsList();
    alert('✅ Filters cleared successfully!');
  } catch (error) {
    console.error('Clear filters error:', error);
    alert('❌ Error clearing filters');
  }
}

function refreshDebtsList() {
  try {
    const debts = getStoredDebts();
    displayDebts(debts);
    alert(`✅ Refreshed! Found ${debts.length} debts`);
    } catch (error) {
    console.error('Refresh error:', error);
    alert('❌ Error refreshing debts');
  }
}

function showAddDebtModal() {
  const modal = createModal('Add New Debt', `
    <form id="addDebtForm">
      <div class="form-group">
        <label for="debtorName">Debtor Name:</label>
        <input type="text" id="debtorName" name="debtor_name" required>
      </div>
      <div class="form-group">
        <label for="amount">Amount (Ksh):</label>
        <input type="number" id="amount" name="amount" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="dueDate">Due Date:</label>
        <input type="date" id="dueDate" name="due_date" required>
      </div>
      <div class="form-group">
        <label for="description">Description:</label>
        <textarea id="description" name="description" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Add Debt</button>
      </div>
    </form>
  `);

  document.getElementById('addDebtForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const debtData = Object.fromEntries(formData.entries());
    addNewDebt(debtData);
  });
}

function showEditDebtModal(id) {
  const debts = getStoredDebts();
  const debt = debts.find(d => d.id == id);
  
  if (!debt) {
    alert('Debt not found');
    return;
  }

  const modal = createModal('Edit Debt', `
    <form id="editDebtForm">
      <input type="hidden" name="id" value="${debt.id}">
      <div class="form-group">
        <label for="editDebtorName">Debtor Name:</label>
        <input type="text" id="editDebtorName" name="debtor_name" value="${debt.debtor_name}" required>
      </div>
      <div class="form-group">
        <label for="editAmount">Amount (Ksh):</label>
        <input type="number" id="editAmount" name="amount" value="${debt.amount}" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="editDueDate">Due Date:</label>
        <input type="date" id="editDueDate" name="due_date" value="${debt.due_date}" required>
      </div>
      <div class="form-group">
        <label for="editStatus">Status:</label>
        <select id="editStatus" name="status">
          <option value="active" ${debt.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="paid" ${debt.status === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="overdue" ${debt.status === 'overdue' ? 'selected' : ''}>Overdue</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editDescription">Description:</label>
        <textarea id="editDescription" name="description" rows="3">${debt.description || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Update Debt</button>
      </div>
    </form>
  `);

  document.getElementById('editDebtForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const debtData = Object.fromEntries(formData.entries());
    updateDebt(debtData);
  });
}

function confirmDeleteDebt(id) {
  const debts = getStoredDebts();
  const debt = debts.find(d => d.id == id);
  
  if (!debt) {
    alert('Debt not found');
    return;
  }

  if (confirm(`Are you sure you want to delete the debt for ${debt.debtor_name} (Ksh ${debt.amount})?`)) {
    deleteDebtById(id);
  }
}

function showDebtDetails(id) {
  const debts = getStoredDebts();
  const debt = debts.find(d => d.id == id);
  
  if (!debt) {
    alert('Debt not found');
    return;
  }

  const modal = createModal('Debt Details', `
    <div class="debt-details">
      <h3>${debt.debtor_name}</h3>
      <div class="detail-row">
        <strong>Amount:</strong> Ksh ${parseFloat(debt.amount).toLocaleString()}
      </div>
      <div class="detail-row">
        <strong>Due Date:</strong> ${debt.due_date}
      </div>
      <div class="detail-row">
        <strong>Status:</strong> <span class="status-${debt.status}">${debt.status}</span>
      </div>
      <div class="detail-row">
        <strong>Created:</strong> ${debt.created_at}
      </div>
      ${debt.description ? `<div class="detail-row"><strong>Description:</strong> ${debt.description}</div>` : ''}
      <div class="detail-actions">
        <button onclick="showEditDebtModal(${debt.id})">Edit</button>
        <button onclick="showRecordPaymentModal(${debt.id})">Record Payment</button>
        <button onclick="confirmDeleteDebt(${debt.id})">Delete</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}

function showRecordPaymentModal(id) {
  const debts = getStoredDebts();
  const debt = debts.find(d => d.id == id);
  
  if (!debt) {
    alert('Debt not found');
    return;
  }

  const modal = createModal('Record Payment', `
    <form id="recordPaymentForm">
      <input type="hidden" name="debt_id" value="${debt.id}">
      <div class="form-group">
        <label>Debtor:</label>
        <input type="text" value="${debt.debtor_name}" readonly>
      </div>
      <div class="form-group">
        <label>Debt Amount:</label>
        <input type="text" value="Ksh ${parseFloat(debt.amount).toLocaleString()}" readonly>
      </div>
      <div class="form-group">
        <label for="paymentAmount">Payment Amount (Ksh):</label>
        <input type="number" id="paymentAmount" name="amount" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="paymentDate">Payment Date:</label>
        <input type="date" id="paymentDate" name="payment_date" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label for="paymentMethod">Payment Method:</label>
        <select id="paymentMethod" name="payment_method">
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="check">Check</option>
        </select>
      </div>
      <div class="form-group">
        <label for="paymentNotes">Notes:</label>
        <textarea id="paymentNotes" name="notes" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Record Payment</button>
      </div>
    </form>
  `);

  document.getElementById('recordPaymentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());
    recordNewPayment(paymentData);
  });
}

// Helper Functions
function getStoredDebts() {
  // Synchronous helper now proxies to last fetched cache if available
  try {
    if (window.__debtsCache && Array.isArray(window.__debtsCache)) {
      return window.__debtsCache;
    }
    // Fallback: attempt quick fetch synchronously via navigator.sendBeacon is not viable;
    // keep legacy localStorage fallback to avoid breaking existing UI while app migrates
    const stored = localStorage.getItem('debtManagerDebts');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting debts cache:', error);
    return [];
  }
}

async function refreshDebtsCache() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/debts', { headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.debts || []);
    window.__debtsCache = list;
    return list;
  } catch (e) {
    console.error('refreshDebtsCache error:', e);
    window.__debtsCache = [];
    return [];
  }
}

function getStoredCredits() {
  try {
    if (window.__creditsCache && Array.isArray(window.__creditsCache)) {
      return window.__creditsCache;
    }
    const stored = localStorage.getItem('debtManagerCredits');
    return stored ? JSON.parse(stored) : [];
    } catch (error) {
    console.error('Error loading stored credits:', error);
    return [];
  }
}

async function refreshCreditsCache() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/credits', { headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.credits || []);
    window.__creditsCache = list;
    return list;
  } catch (e) {
    console.error('refreshCreditsCache error:', e);
    window.__creditsCache = [];
    return [];
  }
}

function storeCredits(credits) {
  try {
    localStorage.setItem('debtManagerCredits', JSON.stringify(credits));
  } catch (error) {
    console.error('Error storing credits:', error);
  }
}

function storeDebts(debts) {
  try {
    localStorage.setItem('debtManagerDebts', JSON.stringify(debts));
  } catch (error) {
    console.error('Error storing debts:', error);
  }
}

function addNewDebt(debtData) {
  try {
    const debts = getStoredDebts();
    const newDebt = {
      id: Date.now(),
      ...debtData,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      user_id: 2
    };
    
    debts.push(newDebt);
    storeDebts(debts);
    
    closeModal();
    refreshDebtsList();
    alert('✅ Debt added successfully!');
    
    // Create alert for new debt
    createDebtAlert(newDebt);
  } catch (error) {
    console.error('Add debt error:', error);
    alert('❌ Error adding debt');
  }
}

function updateDebt(debtData) {
  try {
    const debts = getStoredDebts();
    const index = debts.findIndex(d => d.id == debtData.id);
    
    if (index === -1) {
      alert('Debt not found');
      return;
    }
    
    debts[index] = { ...debts[index], ...debtData };
    storeDebts(debts);
    
    closeModal();
    refreshDebtsList();
    alert('✅ Debt updated successfully!');
  } catch (error) {
    console.error('Update debt error:', error);
    alert('❌ Error updating debt');
  }
}

function deleteDebtById(id) {
  try {
    const debts = getStoredDebts();
    const filteredDebts = debts.filter(d => d.id != id);
    
    if (filteredDebts.length === debts.length) {
      alert('Debt not found');
      return;
    }
    
    storeDebts(filteredDebts);
    refreshDebtsList();
    alert('✅ Debt deleted successfully!');
  } catch (error) {
    console.error('Delete debt error:', error);
    alert('❌ Error deleting debt');
  }
}

function recordNewPayment(paymentData) {
  try {
    const debts = getStoredDebts();
    const debt = debts.find(d => d.id == paymentData.debt_id);
    
    if (!debt) {
      alert('Debt not found');
      return;
    }
    
    const payment = {
      id: Date.now(),
      debt_id: paymentData.debt_id,
      amount: parseFloat(paymentData.amount),
      payment_date: paymentData.payment_date,
      payment_method: paymentData.payment_method,
      notes: paymentData.notes,
      created_at: new Date().toISOString()
    };
    
    // Store payment
    const payments = getStoredPayments();
    payments.push(payment);
    localStorage.setItem('debtManagerPayments', JSON.stringify(payments));
    
    // Update debt status if fully paid
    const totalPaid = payments.filter(p => p.debt_id == debt.id).reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= debt.amount) {
      debt.status = 'paid';
      storeDebts(debts);
    }
    
    closeModal();
    refreshDebtsList();
    alert('✅ Payment recorded successfully!');
    
    // Create payment alert
    createPaymentAlert(payment, debt);
  } catch (error) {
    console.error('Record payment error:', error);
    alert('❌ Error recording payment');
  }
}

function getStoredPayments() {
  try {
    const stored = localStorage.getItem('debtManagerPayments');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading stored payments:', error);
    return [];
  }
}

function displayDebts(debts) {
  // This would update the UI to show the debts
  console.log('Displaying debts:', debts.length);
}

function createDebtAlert(debt) {
  if (window.dashboardController) {
    const alert = {
      id: 'debt-' + debt.id,
      type: 'debt_created',
      priority: 'medium',
      title: 'New Debt Created',
      message: `New debt of Ksh ${parseFloat(debt.amount).toLocaleString()} created for ${debt.debtor_name}`,
      timestamp: new Date(),
      dismissed: false
    };
    
    window.dashboardController.alerts.unshift(alert);
    window.dashboardController.alertCount++;
    window.dashboardController.storeAlerts();
    window.dashboardController.updateAlertDisplay();
  }
}

function createPaymentAlert(payment, debt) {
  if (window.dashboardController) {
    window.dashboardController.createAlert(
      'payment_received',
      'Payment Received',
      `Payment of Ksh ${parseFloat(payment.amount).toLocaleString()} received from ${debt.debtor_name}`,
      'medium'
    );
  }
}

function createModal(title, content) {
  // Remove existing modal
  const existingModal = document.getElementById('debtModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'debtModal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;
  
  // Add modal styles
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #ddd;
    }
    .modal-header h2 {
      margin: 0;
    }
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
    }
    .modal-body {
      padding: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .form-actions button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .form-actions button[type="submit"] {
      background: #007bff;
      color: white;
    }
    .form-actions button[type="button"] {
      background: #6c757d;
      color: white;
    }
    .debt-details .detail-row {
      margin-bottom: 10px;
      padding: 5px 0;
    }
    .status-active { color: #28a745; font-weight: bold; }
    .status-paid { color: #007bff; font-weight: bold; }
    .status-overdue { color: #dc3545; font-weight: bold; }
    .detail-actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    .detail-actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('debtModal');
  if (modal) {
    modal.remove();
  }
}

// Credit Management Functions
function showAddCreditModal() {
  const modal = createModal('Add New Credit', `
    <form id="addCreditForm">
      <div class="form-group">
        <label for="creditorName">Creditor Name:</label>
        <input type="text" id="creditorName" name="creditor_name" required>
      </div>
      <div class="form-group">
        <label for="creditAmount">Amount (Ksh):</label>
        <input type="number" id="creditAmount" name="amount" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="creditDueDate">Due Date:</label>
        <input type="date" id="creditDueDate" name="due_date" required>
      </div>
      <div class="form-group">
        <label for="creditDescription">Description:</label>
        <textarea id="creditDescription" name="description" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Add Credit</button>
      </div>
    </form>
  `);

  document.getElementById('addCreditForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const creditData = Object.fromEntries(formData.entries());
    addNewCredit(creditData);
  });
}

function showEditCreditModal(id) {
  const credits = getStoredCredits();
  const credit = credits.find(c => c.id == id);
  
  if (!credit) {
    alert('Credit not found');
    return;
  }

  const modal = createModal('Edit Credit', `
    <form id="editCreditForm">
      <input type="hidden" name="id" value="${credit.id}">
      <div class="form-group">
        <label for="editCreditorName">Creditor Name:</label>
        <input type="text" id="editCreditorName" name="creditor_name" value="${credit.creditor_name}" required>
      </div>
      <div class="form-group">
        <label for="editCreditAmount">Amount (Ksh):</label>
        <input type="number" id="editCreditAmount" name="amount" value="${credit.amount}" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="editCreditDueDate">Due Date:</label>
        <input type="date" id="editCreditDueDate" name="due_date" value="${credit.due_date}" required>
      </div>
      <div class="form-group">
        <label for="editCreditStatus">Status:</label>
        <select id="editCreditStatus" name="status">
          <option value="active" ${credit.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="paid" ${credit.status === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="overdue" ${credit.status === 'overdue' ? 'selected' : ''}>Overdue</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editCreditDescription">Description:</label>
        <textarea id="editCreditDescription" name="description" rows="3">${credit.description || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Update Credit</button>
      </div>
    </form>
  `);

  document.getElementById('editCreditForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const creditData = Object.fromEntries(formData.entries());
    updateCredit(creditData);
  });
}

function confirmDeleteCredit(id) {
  const credits = getStoredCredits();
  const credit = credits.find(c => c.id == id);
  
  if (!credit) {
    alert('Credit not found');
    return;
  }

  if (confirm(`Are you sure you want to delete the credit for ${credit.creditor_name} (Ksh ${credit.amount})?`)) {
    deleteCreditById(id);
  }
}

function showCreditDetails(id) {
  const credits = getStoredCredits();
  const credit = credits.find(c => c.id == id);
  
  if (!credit) {
    alert('Credit not found');
    return;
  }

  const modal = createModal('Credit Details', `
    <div class="credit-details">
      <h3>${credit.creditor_name}</h3>
      <div class="detail-row">
        <strong>Amount:</strong> Ksh ${parseFloat(credit.amount).toLocaleString()}
      </div>
      <div class="detail-row">
        <strong>Due Date:</strong> ${credit.due_date}
      </div>
      <div class="detail-row">
        <strong>Status:</strong> <span class="status-${credit.status}">${credit.status}</span>
      </div>
      <div class="detail-row">
        <strong>Created:</strong> ${credit.created_at}
      </div>
      ${credit.description ? `<div class="detail-row"><strong>Description:</strong> ${credit.description}</div>` : ''}
      <div class="detail-actions">
        <button onclick="showEditCreditModal(${credit.id})">Edit</button>
        <button onclick="showRecordCreditPaymentModal(${credit.id})">Record Payment</button>
        <button onclick="confirmDeleteCredit(${credit.id})">Delete</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}

function showRecordCreditPaymentModal(id) {
  const credits = getStoredCredits();
  const credit = credits.find(c => c.id == id);
  
  if (!credit) {
    alert('Credit not found');
    return;
  }

  const modal = createModal('Record Credit Payment', `
    <form id="recordCreditPaymentForm">
      <input type="hidden" name="credit_id" value="${credit.id}">
      <div class="form-group">
        <label>Creditor:</label>
        <input type="text" value="${credit.creditor_name}" readonly>
      </div>
      <div class="form-group">
        <label>Credit Amount:</label>
        <input type="text" value="Ksh ${parseFloat(credit.amount).toLocaleString()}" readonly>
      </div>
      <div class="form-group">
        <label for="creditPaymentAmount">Payment Amount (Ksh):</label>
        <input type="number" id="creditPaymentAmount" name="amount" step="0.01" required>
      </div>
      <div class="form-group">
        <label for="creditPaymentDate">Payment Date:</label>
        <input type="date" id="creditPaymentDate" name="payment_date" value="${new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label for="creditPaymentMethod">Payment Method:</label>
        <select id="creditPaymentMethod" name="payment_method">
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="check">Check</option>
        </select>
      </div>
      <div class="form-group">
        <label for="creditPaymentNotes">Notes:</label>
        <textarea id="creditPaymentNotes" name="notes" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button type="submit">Record Payment</button>
      </div>
    </form>
  `);

  document.getElementById('recordCreditPaymentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());
    recordNewCreditPayment(paymentData);
  });
}

function addNewCredit(creditData) {
  try {
    const credits = getStoredCredits();
    const newCredit = {
      id: Date.now(),
      ...creditData,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      user_id: 2,
      dismissed: false
    };
    
    credits.push(newCredit);
    storeCredits(credits);
    
    closeModal();
    alert('✅ Credit added successfully!');
    
    // Create alert for new credit
    createCreditAlert(newCredit);
  } catch (error) {
    console.error('Add credit error:', error);
    alert('❌ Error adding credit');
  }
}

function updateCredit(creditData) {
  try {
    const credits = getStoredCredits();
    const index = credits.findIndex(c => c.id == creditData.id);
    
    if (index === -1) {
      alert('Credit not found');
      return;
    }

    credits[index] = { ...credits[index], ...creditData };
    storeCredits(credits);
    
    closeModal();
    alert('✅ Credit updated successfully!');
  } catch (error) {
    console.error('Update credit error:', error);
    alert('❌ Error updating credit');
  }
}

function deleteCreditById(id) {
  try {
    const credits = getStoredCredits();
    const filteredCredits = credits.filter(c => c.id != id);
    
    if (filteredCredits.length === credits.length) {
      alert('Credit not found');
      return;
    }
    
    storeCredits(filteredCredits);
    alert('✅ Credit deleted successfully!');
  } catch (error) {
    console.error('Delete credit error:', error);
    alert('❌ Error deleting credit');
  }
}

function recordNewCreditPayment(paymentData) {
  try {
    const credits = getStoredCredits();
    const credit = credits.find(c => c.id == paymentData.credit_id);
    
    if (!credit) {
      alert('Credit not found');
      return;
    }
    
    const payment = {
      id: Date.now(),
      credit_id: paymentData.credit_id,
      amount: parseFloat(paymentData.amount),
      payment_date: paymentData.payment_date,
      payment_method: paymentData.payment_method,
      notes: paymentData.notes,
      created_at: new Date().toISOString()
    };
    
    // Store payment
    const payments = getStoredCreditPayments();
    payments.push(payment);
    localStorage.setItem('debtManagerCreditPayments', JSON.stringify(payments));
    
    // Update credit status if fully paid
    const totalPaid = payments.filter(p => p.credit_id == credit.id).reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= credit.amount) {
      credit.status = 'paid';
      storeCredits(credits);
    }
    
    closeModal();
    alert('✅ Credit payment recorded successfully!');
    
    // Create payment alert
    createCreditPaymentAlert(payment, credit);
  } catch (error) {
    console.error('Record credit payment error:', error);
    alert('❌ Error recording credit payment');
  }
}

function getStoredCreditPayments() {
  try {
    const stored = localStorage.getItem('debtManagerCreditPayments');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading stored credit payments:', error);
    return [];
  }
}

function createCreditAlert(credit) {
  if (window.dashboardController) {
    window.dashboardController.createAlert(
      'credit_created',
      'New Creditor Added',
      `New credit of Ksh ${parseFloat(credit.amount).toLocaleString()} created for ${credit.creditor_name}`,
      'medium'
    );
  }
}

function createCreditPaymentAlert(payment, credit) {
  if (window.dashboardController) {
    window.dashboardController.createAlert(
      'credit_payment_made',
      'Credit Payment Made',
      `Payment of Ksh ${parseFloat(payment.amount).toLocaleString()} made to ${credit.creditor_name}`,
      'medium'
    );
  }
}

// Dismiss alert
window.dismissAlert = function(alertId) {
  try {
    console.log('⚠️ Dismissing alert:', alertId);

    // Find and dismiss the alert
    const alertIndex = dashboardController.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      dashboardController.alerts[alertIndex].dismissed = true;
      dashboardController.alertCount = dashboardController.alerts.filter(alert => !alert.dismissed).length;

      // Store updated alerts
      dashboardController.storeAlerts();

      // Update display
      dashboardController.updateAlertDisplay();

      console.log('⚠️ Alert dismissed successfully');
    }
  } catch (error) {
    console.error('Error dismissing alert:', error);
  }
};

// Handle alert click for navigation
window.handleAlertClick = function(alertId, alertType) {
  try {
    console.log('🔔 Alert clicked:', alertId, alertType);

    // Close the alerts dropdown
    const dropdown = document.getElementById('alerts-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }

    // Navigate based on alert type
    switch (alertType) {
      case 'overdue_debt':
        // Extract debt ID from alert ID (format: overdue-debt-{id})
        const debtId = alertId.replace('overdue-debt-', '');
        if (window.dashboardController) {
          window.dashboardController.loadModule('debt-management/payment-schedule');
          window.dashboardController.setActiveNavLinkByModule('debt-management/payment-schedule');
        }
        break;

      case 'debt_created':
        if (window.dashboardController) {
          window.dashboardController.loadModule('debt-management/payment-schedule');
          window.dashboardController.setActiveNavLinkByModule('debt-management/payment-schedule');
        }
        break;

      case 'credit_created':
        if (window.dashboardController) {
          window.dashboardController.loadModule('credit-management/credit-accounts');
          window.dashboardController.setActiveNavLinkByModule('credit-management/credit-accounts');
        }
        break;

      case 'payment_received':
        if (window.dashboardController) {
          window.dashboardController.loadModule('transaction-management/pending-transactions');
          window.dashboardController.setActiveNavLinkByModule('transaction-management/pending-transactions');
        }
        break;

      case 'credit_payment_made':
        if (window.dashboardController) {
          window.dashboardController.loadModule('credit-management/credit-transactions');
          window.dashboardController.setActiveNavLinkByModule('credit-management/credit-transactions');
        }
        break;

      case 'test':
        // Test alert - just dismiss it
        dismissAlert(alertId);
        break;

      default:
        console.log('⚠️ Unknown alert type:', alertType);
    }
  } catch (error) {
    console.error('Error handling alert click:', error);
  }
};

// Form Submission Handlers
function setupFormHandlers() {
  // Record Debt Form
  const recordDebtForm = document.getElementById('record-debt-form');
  if (recordDebtForm) {
    recordDebtForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Record debt form submitted');
      handleRecordDebtSubmission(this);
    });
  }

  // Record Credit Form
  const recordCreditForm = document.getElementById('record-credit-form');
  if (recordCreditForm) {
    recordCreditForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Record credit form submitted');
      handleRecordCreditSubmission(this);
    });
  }

  // Make Payment Form
  const makePaymentForm = document.getElementById('make-payment-form');
  if (makePaymentForm) {
    makePaymentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Make payment form submitted');
      handleMakePaymentSubmission(this);
    });
  }

  // Search Input Handlers
  const searchInputs = document.querySelectorAll('#search-input');
  searchInputs.forEach(input => {
    input.addEventListener('input', function() {
      const module = window.dashboardController?.currentModule;
      if (module?.includes('debt')) {
        searchDebts();
      } else if (module?.includes('credit')) {
        searchCredits();
      }
    });
  });

  // Filter Handlers
  const statusFilters = document.querySelectorAll('#status-filter');
  statusFilters.forEach(filter => {
    filter.addEventListener('change', function() {
      const module = window.dashboardController?.currentModule;
      if (module?.includes('debt')) {
        searchDebts();
      } else if (module?.includes('credit')) {
        searchCredits();
      }
    });
  });

  const categoryFilters = document.querySelectorAll('#category-filter');
  categoryFilters.forEach(filter => {
    filter.addEventListener('change', function() {
      searchDebts();
    });
  });

  const typeFilters = document.querySelectorAll('#type-filter');
  typeFilters.forEach(filter => {
    filter.addEventListener('change', function() {
      searchCredits();
    });
  });
}

function handleRecordDebtSubmission(form) {
  try {
    const formData = new FormData(form);
    const debtData = {
      debtor_name: form.querySelector('#debtor-name')?.value,
      debtor_email: form.querySelector('#debtor-email')?.value,
      debtor_phone: form.querySelector('#debtor-phone')?.value,
      reference_number: form.querySelector('#reference-number')?.value,
      amount: parseFloat(form.querySelector('#amount')?.value || 0),
      interest_rate: parseFloat(form.querySelector('#interest-rate')?.value || 0),
      due_date: form.querySelector('#due-date')?.value,
      category: form.querySelector('#category')?.value,
      description: form.querySelector('#description')?.value,
      payment_terms: form.querySelector('#payment-terms')?.value,
      notes: form.querySelector('#notes')?.value
    };

    // Validate required fields
    if (!debtData.debtor_name || !debtData.amount || !debtData.due_date) {
      alert('Please fill in all required fields (Debtor Name, Amount, Due Date)');
      return;
    }

    addNewDebt(debtData);
    goToViewDebts();
  } catch (error) {
    console.error('Error handling debt submission:', error);
    alert('❌ Error recording debt');
  }
}

function handleRecordCreditSubmission(form) {
  try {
    const formData = new FormData(form);
    const creditData = {
      creditor_name: form.querySelector('#credit-name')?.value,
      amount: parseFloat(form.querySelector('#credit-amount')?.value || 0),
      type: form.querySelector('#credit-type')?.value,
      due_date: form.querySelector('#credit-date')?.value,
      description: form.querySelector('#credit-description')?.value,
      source: form.querySelector('#credit-source')?.value,
      reference: form.querySelector('#credit-reference')?.value,
      notes: form.querySelector('#credit-notes')?.value
    };

    // Validate required fields
    if (!creditData.creditor_name || !creditData.amount || !creditData.due_date) {
      alert('Please fill in all required fields (Credit Name, Amount, Date)');
      return;
    }

    addNewCredit(creditData);
    goToViewCredits();
  } catch (error) {
    console.error('Error handling credit submission:', error);
    alert('❌ Error recording credit');
  }
}

function handleMakePaymentSubmission(form) {
  try {
    const formData = new FormData(form);
    const paymentData = {
      payee_name: form.querySelector('#payee-name')?.value,
      amount: parseFloat(form.querySelector('#payment-amount')?.value || 0),
      payment_method: form.querySelector('#payment-method')?.value,
      payment_date: form.querySelector('#payment-date')?.value,
      reference: form.querySelector('#payment-reference')?.value,
      category: form.querySelector('#payment-category')?.value,
      notes: form.querySelector('#payment-notes')?.value
    };

    // Validate required fields
    if (!paymentData.payee_name || !paymentData.amount || !paymentData.payment_method || !paymentData.payment_date) {
      alert('Please fill in all required fields (Payee Name, Amount, Payment Method, Payment Date)');
      return;
    }

    recordNewPayment(paymentData);
    goToTransactionHistory();
  } catch (error) {
    console.error('Error handling payment submission:', error);
    alert('❌ Error recording payment');
  }
}

// Setup quick stats click handlers
function setupQuickStats() {
  console.log('🔧 Setting up quick stats click handlers...');

  const quickStats = document.querySelectorAll('.quick-stat');
  console.log('🔧 Found quick stats:', quickStats.length);

  quickStats.forEach((stat, index) => {
    const statText = stat.querySelector('.stat-text')?.textContent?.toLowerCase();
    console.log(`🔧 Setting up quick stat ${index + 1}: ${statText}`);

    stat.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('📊 Quick stat clicked:', statText);

      if (!window.dashboardController) {
        console.error('❌ Dashboard controller not found!');
        return;
      }

      // Navigate based on the stat text
      switch (statText) {
        case 'analytics':
          window.dashboardController.loadModule('overview/analytics');
          window.dashboardController.setActiveNavLinkByModule('overview/analytics');
          break;
        case 'debts':
          window.dashboardController.loadModule('debt-management/payment-schedule');
          window.dashboardController.setActiveNavLinkByModule('debt-management/payment-schedule');
          break;
        case 'credits':
          window.dashboardController.loadModule('credit-management/credit-accounts');
          window.dashboardController.setActiveNavLinkByModule('credit-management/credit-accounts');
          break;
        case 'transactions':
          window.dashboardController.loadModule('transaction-management/pending-transactions');
          window.dashboardController.setActiveNavLinkByModule('transaction-management/pending-transactions');
          break;
        default:
          console.log('⚠️ Unknown quick stat:', statText);
      }
    });
  });

  console.log('✅ Quick stats setup complete');
}

// Setup navbar interactions
function setupNavbarInteractions() {
  console.log('🔧 Setting up navbar interactions...');

  // Alerts button click handler
  const alertsBtn = document.getElementById('alerts-btn');
  if (alertsBtn) {
    console.log('🔧 Setting up alerts button');
    alertsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔔 Alerts button clicked');

      const dropdown = document.getElementById('alerts-dropdown');
      if (dropdown) {
        const isVisible = dropdown.classList.contains('show');
        // Hide all dropdowns first
        document.querySelectorAll('.alerts-dropdown, .user-dropdown').forEach(d => {
          d.classList.remove('show');
          d.style.display = 'none';
        });

        if (!isVisible) {
          dropdown.classList.add('show');
          dropdown.style.display = 'block';
        }
      }
    });
  }

  // User button click handler
  const userBtn = document.getElementById('user-btn');
  if (userBtn) {
    console.log('🔧 Setting up user button');
    userBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('👤 User button clicked');

      const dropdown = document.getElementById('user-dropdown');
      if (dropdown) {
        const isVisible = dropdown.classList.contains('show');
        // Hide all dropdowns first
        document.querySelectorAll('.alerts-dropdown, .user-dropdown').forEach(d => {
          d.classList.remove('show');
          d.style.display = 'none';
        });

        if (!isVisible) {
          dropdown.classList.add('show');
          dropdown.style.display = 'block';
        }
      }
    });
  }

  // Logout link click handler
  const logoutLink = document.getElementById('logout');
  if (logoutLink) {
    console.log('🔧 Setting up logout link');
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🚪 Logout clicked');
      window.logout();
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.navbar-alerts') && !e.target.closest('.navbar-user')) {
      document.querySelectorAll('.alerts-dropdown, .user-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
        dropdown.style.display = 'none';
      });
    }
  });

  console.log('✅ Navbar interactions setup complete');
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 DOM Content Loaded - Creating DashboardController...');
  console.log('🔧 Available elements:', {
    alertsBtn: !!document.getElementById('alerts-btn'),
    userProfile: !!document.querySelector('.user-profile'),
    navLinks: document.querySelectorAll('.nav-link').length,
    quickStats: document.querySelectorAll('.quick-stat').length
  });

  try {
    window.dashboardController = new DashboardController();
    console.log('✅ DashboardController created successfully');

    // Test if global functions are available
    console.log('🔧 Global functions test:', {
      logout: typeof window.logout,
      exportDebts: typeof window.exportDebts,
      addDebt: typeof window.addDebt,
      clearFilters: typeof window.clearFilters
    });

  // Setup navbar interactions
  setupNavbarInteractions();

  // Setup sidebar navigation event listeners
  setupSidebarNavigation();

  // Setup quick stats click handlers
  setupQuickStats();

  // Setup form handlers after a short delay to ensure all modules are loaded
  setTimeout(() => {
    setupFormHandlers();
    console.log('✅ Form handlers setup complete');
  }, 1000);

  // Test alerts functionality
  setTimeout(() => {
    console.log('⚠️ Testing alerts system...');
    if (window.dashboardController) {
      // Create a test alert to verify the system works
      window.dashboardController.createAlert(
        'test',
        'Welcome to Debt Collection System',
        'Your notification system is now active! Click alerts to see notifications.',
        'medium'
      );
      console.log('⚠️ Test alert created');
    }
  }, 2000);
  } catch (error) {
    console.error('❌ Error creating DashboardController:', error);
  }
});

// Setup sidebar navigation event listeners
function setupSidebarNavigation() {
  console.log('🔧 Setting up sidebar navigation...');

  // Find all nav links
  const navLinks = document.querySelectorAll('.nav-link');
  console.log('🔧 Found nav links:', navLinks.length);

  // Add click event listeners to all nav links
  navLinks.forEach((link, index) => {
    console.log(`🔧 Setting up nav link ${index + 1}:`, link.id, 'data-module:', link.getAttribute('data-module'));
    link.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🔗 Nav link clicked:', this.id, 'data-module:', this.getAttribute('data-module'));

      // Set active state
      window.dashboardController.setActiveNavLink(this);

      // Load the module
      const modulePath = this.getAttribute('data-module');
      if (modulePath) {
        window.dashboardController.loadModule(modulePath);
      }
    });
  });

  console.log('✅ Sidebar navigation setup complete');
}
