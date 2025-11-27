// Pending Transactions Module Script
(function() {
  'use strict';
  
  let allPendingTransactions = [];
  let filteredPendingTransactions = [];
  let currentTab = 'all';
  let refreshTimer = null;

  // Local API helper (uses shared apiUtils if present; otherwise falls back to fetch)
  async function apiCall(endpoint, options = {}) {
    if (window.apiUtils && typeof window.apiUtils.apiCall === 'function') {
      return window.apiUtils.apiCall(endpoint, options);
    }
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required (no token). Please log in.');
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(endpoint, { ...options, headers, cache: 'no-store' });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }
    return response.json();
  }
  
  // Module initialization that works when injected after DOMContentLoaded
  function init() {
    loadPendingTransactions();
    setupEventListeners();
    // Bind simple buttons to avoid inline handlers
    const clearBtn = document.getElementById('clear-pending-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => window.clearFilters());
    const recvBtn = document.getElementById('pending-receive-btn');
    if (recvBtn) recvBtn.addEventListener('click', () => window.goToReceivePayment());
    const refBtn = document.getElementById('pending-refresh-btn');
    if (refBtn) refBtn.addEventListener('click', () => window.refreshPending());
    const sendBtn = document.getElementById('send-reminders-btn');
    if (sendBtn) sendBtn.addEventListener('click', () => window.sendReminders());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Filter selects
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    if (statusFilter) {
      statusFilter.addEventListener('change', handleFilter);
    }
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', handleFilter);
    }
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  async function loadPendingTransactions() {
    try {
      console.log('Loading pending transactions...');
      
      // Show loading state
      showLoadingState();
      
      // Fetch pending transactions data
      const data = await apiCall('/transactions/pending/list').catch(err => {
        console.warn('Pending transactions API failed:', err);
        return [];
      });
      
      allPendingTransactions = data || [];
      filteredPendingTransactions = [...allPendingTransactions];
      
      // Update UI
      updatePendingStats();
      renderPendingList();
      startAutoRefresh();
      
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      const msg = ('' + error.message).includes('Authentication') ?
        'You need to log in to view pending transactions. Redirecting to login…' :
        `Failed to load pending transactions: ${error.message}`;
      showErrorState(msg);
      if (('' + error.message).includes('Authentication')) {
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      }
    }
  }
  
  function showLoadingState() {
    document.getElementById('pending-stats').innerHTML = '<div class="loading-message">Loading pending transaction statistics...</div>';
    document.getElementById('pending-list').innerHTML = '<div class="loading-message">Loading pending transactions...</div>';
  }
  
  function showErrorState(message) {
    const retryBtn = `<button class="btn-secondary" id="pending-retry">Retry</button>`;
    document.getElementById('pending-stats').innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('pending-list').innerHTML = `<div class="error-message">${message} ${retryBtn}</div>`;
    const btn = document.getElementById('pending-retry');
    if (btn) btn.addEventListener('click', () => loadPendingTransactions());
  }
  
  function updatePendingStats() {
    const totalPending = allPendingTransactions.length;
    const totalAmount = allPendingTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    
    // Calculate overdue
    const today = new Date();
    const overdueTransactions = allPendingTransactions.filter(transaction => {
      if (!transaction.due_date) return false;
      return new Date(transaction.due_date) < today;
    }).length;
    
    // Calculate due today
    const dueTodayTransactions = allPendingTransactions.filter(transaction => {
      if (!transaction.due_date) return false;
      const dueDate = new Date(transaction.due_date);
      return dueDate.toDateString() === today.toDateString();
    }).length;
    
    // Calculate this week
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisWeekTransactions = allPendingTransactions.filter(transaction => {
      if (!transaction.due_date) return false;
      const dueDate = new Date(transaction.due_date);
      return dueDate >= today && dueDate <= weekFromNow;
    }).length;
    
    document.getElementById('pending-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">${totalPending}</div>
          <div class="stat-label">Total Pending</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${formatCurrency(totalAmount)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">${overdueTransactions}</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">${dueTodayTransactions}</div>
          <div class="stat-label">Due Today</div>
        </div>
      </div>
    `;
  }
  
  function renderPendingList() {
    const container = document.getElementById('pending-list');
    
    // Filter transactions based on current tab
    let tabTransactions = filteredPendingTransactions;
    
    switch (currentTab) {
      case 'overdue':
        tabTransactions = filteredPendingTransactions.filter(transaction => {
          if (!transaction.due_date) return false;
          const dueDate = new Date(transaction.due_date);
          const today = new Date();
          return dueDate < today;
        });
        break;
      case 'due_today':
        tabTransactions = filteredPendingTransactions.filter(transaction => {
          if (!transaction.due_date) return false;
          const dueDate = new Date(transaction.due_date);
          const today = new Date();
          return dueDate.toDateString() === today.toDateString();
        });
        break;
      case 'this_week':
        tabTransactions = filteredPendingTransactions.filter(transaction => {
          if (!transaction.due_date) return false;
          const dueDate = new Date(transaction.due_date);
          const today = new Date();
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return dueDate >= today && dueDate <= weekFromNow;
        });
        break;
    }
    
    if (tabTransactions.length === 0) {
      const messages = {
        all: 'No pending transactions found',
        overdue: 'No overdue transactions found',
        due_today: 'No transactions due today',
        this_week: 'No transactions due this week'
      };
      
      container.innerHTML = `
        <div class="no-data-message">
          <h3>${messages[currentTab]}</h3>
          <p>All transactions are up to date!</p>
          <a href="#" onclick="goToReceivePayment()">Record a payment</a>
        </div>
      `;
      return;
    }
    
    // Sort transactions by due date
    tabTransactions.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    
    container.innerHTML = tabTransactions.map(transaction => {
      const dueDate = transaction.due_date ? new Date(transaction.due_date) : null;
      const today = new Date();
      const isOverdue = dueDate && dueDate < today;
      const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
      
      let statusClass = 'pending';
      let statusText = 'Pending';
      let icon = '⏰';
      
      if (isOverdue) {
        statusClass = 'overdue';
        statusText = 'Overdue';
        icon = '⚠️';
      } else if (isDueToday) {
        statusClass = 'due-today';
        statusText = 'Due Today';
        icon = '🚨';
      }
      
      return `
        <div class="pending-item ${statusClass}">
          <div class="pending-icon">${icon}</div>
          <div class="pending-info">
            <div class="pending-debtor">${transaction.debtor_name || 'Unknown Debtor'}</div>
            <div class="pending-description">${transaction.description || 'Payment due'}</div>
            <div class="pending-meta">
              <span>Reference: ${transaction.reference_number || 'N/A'}</span>
              <span>Category: ${transaction.category || 'Uncategorized'}</span>
            </div>
          </div>
          <div class="pending-amount">${formatCurrency(transaction.amount || 0)}</div>
          <div class="pending-due-date">${dueDate ? formatDate(dueDate) : 'Not set'}</div>
          <div class="pending-status ${statusClass}">${statusText}</div>
          <div class="pending-actions">
            <button class="btn-small btn-primary" onclick="processPayment(${transaction.id})">Process</button>
            <button class="btn-small btn-secondary" onclick="viewDetails(${transaction.id})">View</button>
            <button class="btn-small btn-success" onclick="sendReminder(${transaction.id})">Remind</button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    applyFilters(searchTerm);
  }
  
  function handleFilter() {
    applyFilters();
  }
  
  function applyFilters(searchTerm = '') {
    const statusFilter = document.getElementById('status-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    filteredPendingTransactions = allPendingTransactions.filter(transaction => {
      // Search filter
      if (searchTerm) {
        const searchableText = [
          transaction.debtor_name || '',
          transaction.description || '',
          transaction.reference_number || '',
          transaction.category || '',
          (transaction.amount || 0).toString()
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter) {
        const today = new Date();
        const dueDate = transaction.due_date ? new Date(transaction.due_date) : null;
        
        switch (statusFilter) {
          case 'overdue':
            if (!dueDate || dueDate >= today) return false;
            break;
          case 'due_today':
            if (!dueDate || dueDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'pending':
            if (dueDate && (dueDate < today || dueDate.toDateString() === today.toDateString())) return false;
            break;
        }
      }
      
      // Category filter
      if (categoryFilter && transaction.category !== categoryFilter) {
        return false;
      }
      
      return true;
    });
    
    renderPendingList();
  }
  
  // Global functions
  window.clearFilters = function() {
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('category-filter').value = '';
    filteredPendingTransactions = [...allPendingTransactions];
    renderPendingList();
  };
  
  window.switchTab = function(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Update current tab
    currentTab = tab;
    
    // Re-render list
    renderPendingList();
  };
  
  window.goToReceivePayment = function() {
    // Navigate to receive payment by simulating sidebar click
    const receivePaymentLink = document.getElementById('sidebar-receive-payment');
    if (receivePaymentLink) {
      receivePaymentLink.click();
    } else {
      // Fallback: direct navigation
      window.location.href = '/dashboard/transaction-management/receive-payment';
    }
  };
  
  window.sendReminders = function() {
    const overdueTransactions = allPendingTransactions.filter(transaction => {
      if (!transaction.due_date) return false;
      const dueDate = new Date(transaction.due_date);
      const today = new Date();
      return dueDate < today;
    });
    
    if (overdueTransactions.length === 0) {
      alert('No overdue transactions found to send reminders for.');
      return;
    }
    
    // Create bulk reminder modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Send Bulk Reminders</h3>
          <button class="modal-close" onclick="closeBulkReminderModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="bulk-reminder-info">
            <p><strong>Found ${overdueTransactions.length} overdue transactions</strong></p>
            <p>This will send reminders to all overdue debtors.</p>
          </div>
          <div class="form-group">
            <label for="bulk-reminder-method">Reminder Method:</label>
            <select id="bulk-reminder-method">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div class="form-group">
            <label for="bulk-reminder-message">Custom Message (optional):</label>
            <textarea id="bulk-reminder-message" rows="4" placeholder="Enter a custom reminder message...">Hi, this is a friendly reminder that you have an overdue payment. Please contact us to arrange payment as soon as possible. Thank you!</textarea>
          </div>
          <div class="transaction-list">
            <h4>Transactions to be reminded:</h4>
            <div class="transaction-items">
      ${overdueTransactions.map(transaction => `
                <div class="transaction-item">
                  <span>${transaction.debtor_name || 'Unknown'}</span>
          <span>${formatCurrency(transaction.amount || 0)}</span>
          <span>${transaction.due_date ? formatDate(new Date(transaction.due_date)) : 'Not set'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeBulkReminderModal()">Cancel</button>
          <button class="btn-primary" onclick="sendBulkReminders()">Send All Reminders</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal function
    window.closeBulkReminderModal = function() {
      document.body.removeChild(modal);
      delete window.closeBulkReminderModal;
      delete window.sendBulkReminders;
    };
    
    // Send bulk reminders function
    window.sendBulkReminders = function() {
      const method = document.getElementById('bulk-reminder-method').value;
      const message = document.getElementById('bulk-reminder-message').value;
      
      // Send real reminders by creating notifications on the server
      const tasks = overdueTransactions.map(tx => createReminderNotification({
        debtorName: tx.debtor_name,
        amount: tx.amount,
        dueDate: tx.due_date,
        method,
        customMessage: message
      }).catch(err => ({ error: err?.message || 'Failed' })));
      Promise.all(tasks).then(results => {
        const failures = results.filter(r => r && r.error).length;
        if (failures > 0) {
          alert(`Some reminders failed (${failures}). Others were sent successfully.`);
        } else {
          alert(`Bulk reminders sent via ${method} to ${overdueTransactions.length} debtors`);
        }
        closeBulkReminderModal();
      });
    };
    
    // Close on overlay click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeBulkReminderModal();
      }
    });
  };
  
  window.refreshPending = function() {
    loadPendingTransactions();
  };
  
  window.processPayment = function(id) {
    console.log('Process payment:', id);
    // Navigate to receive payment by simulating sidebar click
    const receivePaymentLink = document.getElementById('sidebar-receive-payment');
    if (receivePaymentLink) {
      receivePaymentLink.click();
    } else {
      // Fallback: direct navigation
      window.location.href = '/dashboard/transaction-management/receive-payment';
    }
    
    // Pre-fill the form with this transaction's data
    setTimeout(() => {
      const transaction = allPendingTransactions.find(t => t.id === id);
      if (transaction) {
        const debtorNameField = document.getElementById('debtor-name');
        const paymentAmountField = document.getElementById('payment-amount');
        
        if (debtorNameField) debtorNameField.value = transaction.debtor_name || '';
        if (paymentAmountField) paymentAmountField.value = transaction.amount || '';
        
        // Select the debt
        const debtItem = document.querySelector(`[data-debt-id="${id}"]`);
        if (debtItem) {
          const checkbox = debtItem.querySelector('.debt-checkbox');
          if (checkbox) {
            checkbox.checked = true;
            if (typeof window.toggleDebtSelection === 'function') {
              window.toggleDebtSelection(id);
            }
          }
        }
      }
    }, 1000);
  };
  
  window.viewDetails = function(id) {
    console.log('View details:', id);
    const transaction = allPendingTransactions.find(t => t.id === id);
    if (!transaction) {
      alert('Transaction not found');
      return;
    }
    
    // Create a detailed view modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Transaction Details</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <label>Debtor Name:</label>
            <span>${transaction.debtor_name || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <label>Amount:</label>
            <span>${window.DashboardController.prototype.formatCurrency(transaction.amount || 0)}</span>
          </div>
          <div class="detail-row">
            <label>Description:</label>
            <span>${transaction.description || 'No description'}</span>
          </div>
          <div class="detail-row">
            <label>Reference:</label>
            <span>${transaction.reference_number || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <label>Category:</label>
            <span>${transaction.category || 'Uncategorized'}</span>
          </div>
          <div class="detail-row">
            <label>Due Date:</label>
            <span>${transaction.due_date ? window.DashboardController.prototype.formatDate(new Date(transaction.due_date)) : 'Not set'}</span>
          </div>
          <div class="detail-row">
            <label>Status:</label>
            <span class="status-badge ${transaction.status || 'pending'}">${transaction.status || 'Pending'}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeModal()">Close</button>
          <button class="btn-primary" onclick="processPayment(${id}); closeModal();">Process Payment</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal function
    window.closeModal = function() {
      document.body.removeChild(modal);
      delete window.closeModal;
    };
    
    // Close on overlay click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  };
  
  window.sendReminder = function(id) {
    console.log('Send reminder:', id);
    const transaction = allPendingTransactions.find(t => t.id === id);
    if (!transaction) {
      alert('Transaction not found');
      return;
    }
    
    // Create a reminder modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Send Reminder</h3>
          <button class="modal-close" onclick="closeReminderModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="reminder-info">
            <p><strong>Debtor:</strong> ${transaction.debtor_name || 'Unknown'}</p>
            <p><strong>Amount:</strong> ${formatCurrency(transaction.amount || 0)}</p>
            <p><strong>Due Date:</strong> ${transaction.due_date ? formatDate(new Date(transaction.due_date)) : 'Not set'}</p>
          </div>
          <div class="form-group">
            <label for="reminder-method">Reminder Method:</label>
            <select id="reminder-method">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Phone Call</option>
            </select>
          </div>
          <div class="form-group">
            <label for="reminder-message">Custom Message (optional):</label>
            <textarea id="reminder-message" rows="4" placeholder="Enter a custom reminder message...">Hi ${transaction.debtor_name || 'there'}, this is a friendly reminder that you have a payment of ${formatCurrency(transaction.amount || 0)} due${transaction.due_date ? ' on ' + formatDate(new Date(transaction.due_date)) : ''}. Please contact us to arrange payment. Thank you!</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeReminderModal()">Cancel</button>
          <button class="btn-primary" onclick="sendReminderNow(${id})">Send Reminder</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal function
    window.closeReminderModal = function() {
      document.body.removeChild(modal);
      delete window.closeReminderModal;
      delete window.sendReminderNow;
    };
    
    // Send reminder function
    window.sendReminderNow = function(transactionId) {
      const method = document.getElementById('reminder-method').value;
      const message = document.getElementById('reminder-message').value;
      
      createReminderNotification({
        debtorName: transaction.debtor_name,
        amount: transaction.amount,
        dueDate: transaction.due_date,
        method,
        customMessage: message
      }).then(() => {
        alert(`Reminder sent via ${method} to ${transaction.debtor_name || 'debtor'}`);
        closeReminderModal();
      }).catch(err => {
        alert(`Failed to send reminder: ${err?.message || 'Unknown error'}`);
      });
    };
    
    // Close on overlay click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeReminderModal();
      }
    });
  };
  
  // Initialize the module
  function initializeInteractivity() {
    console.log('Pending Transactions Module: Initializing...');
    loadPendingTransactions();
    setupEventListeners();
  }

  // Export functions for external use
  window.pendingTransactionsModule = {
    loadData: loadPendingTransactions,
    refresh: loadPendingTransactions,
    switchTab: switchTab,
    clearFilters: clearFilters,
    initializeInteractivity
  };
  
  // Local formatters to avoid dependency on DashboardController
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(parseFloat(amount) || 0);
  }
  function formatDate(date) {
    try {
      const d = (date instanceof Date) ? date : new Date(date);
      return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) { return 'N/A'; }
  }

  // Create a reminder notification via backend
  async function createReminderNotification({ debtorName, amount, dueDate, method, customMessage }) {
    const title = 'Payment Reminder';
    const defaultMsg = `Reminder: Payment of ${formatCurrency(amount || 0)}${dueDate ? ` due on ${formatDate(dueDate)}` : ''} for ${debtorName || 'debtor'}.`;
    const message = customMessage && customMessage.trim() ? customMessage.trim() : defaultMsg;
    const payload = {
      type: 'payment_due',
      title,
      message,
      relatedId: null,
      relatedType: 'debt',
      priority: method === 'email' ? 'medium' : 'high'
    };
    await apiCall('/notifications/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return { ok: true };
  }

  function startAutoRefresh() {
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      loadPendingTransactions();
    }, 10000); // 10s polling
  }
  
})();
