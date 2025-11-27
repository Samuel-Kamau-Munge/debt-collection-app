// Payment Schedule Module Script
(function() {
  'use strict';
  
  let allPayments = [];
  let filteredPayments = [];
  let currentTab = 'upcoming';
  const REFRESH_INTERVAL_MS = 10000; // 10s
  let refreshTimer = null;
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    loadPaymentSchedule();
    setupEventListeners();
    startAutoRefresh();
  });
  
  function setupEventListeners() {
    // Filter selects
    const timeFilter = document.getElementById('time-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (timeFilter) {
      timeFilter.addEventListener('change', handleFilter);
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', handleFilter);
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (!document.hidden) {
        loadPaymentSchedule();
      }
    }, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', handleVisibilityRefresh, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityRefresh, { passive: true });
    window.addEventListener('beforeunload', stopAutoRefresh, { passive: true });
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    window.removeEventListener('focus', handleVisibilityRefresh);
    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    window.removeEventListener('beforeunload', stopAutoRefresh);
  }

  function handleVisibilityRefresh() {
    if (!document.hidden) {
      loadPaymentSchedule();
    }
  }
  
  async function loadPaymentSchedule() {
    // Safety timeout - force error after 3 seconds
    const safetyTimeout = setTimeout(() => {
      console.error('Safety timeout triggered - forcing error display');
      const listEl = document.getElementById('schedule-list');
      if (listEl && listEl.innerHTML.includes('Loading')) {
        listEl.innerHTML = `
          <div class="error-message">
            <h3>⚠️ Connection Timeout</h3>
            <p>Request took too long. The server may be slow or unavailable.</p>
            <button onclick="loadPaymentSchedule()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
          </div>
        `;
      }
      // Reset stat values
      const upcomingEl = document.getElementById('upcoming-count');
      const overdueEl = document.getElementById('overdue-count');
      const totalEl = document.getElementById('total-amount');
      const completedEl = document.getElementById('completed-count');
      if (upcomingEl && upcomingEl.textContent === '...') upcomingEl.textContent = '0';
      if (overdueEl && overdueEl.textContent === '...') overdueEl.textContent = '0';
      if (totalEl && totalEl.textContent === '...') totalEl.textContent = 'Ksh 0';
      if (completedEl && completedEl.textContent === '...') completedEl.textContent = '0';
    }, 3000);
    
    try {
      console.log('Loading payment schedule...');
      
      // Show loading state
      showLoadingState();
      
      // Get token
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Create timeout promise (3 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 3000);
      });
      
      // Try to fetch debts directly (simpler and more reliable)
      const fetchPromise = fetch('/api/debts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      let response;
      try {
        response = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (timeoutError) {
        clearTimeout(safetyTimeout);
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      clearTimeout(safetyTimeout);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Debts data loaded:', data);
      
      // Convert debts to payment schedule format
      const debts = Array.isArray(data) ? data : (data.debts || []);
      
      allPayments = debts
        .filter(debt => debt.status !== 'paid' && debt.status !== 'cancelled')
        .map(debt => {
          const dueDate = debt.due_date ? new Date(debt.due_date) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let daysUntilDue = null;
          let scheduleStatus = 'Scheduled';
          
          if (dueDate) {
            dueDate.setHours(0, 0, 0, 0);
            daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (dueDate < today) {
              scheduleStatus = 'Overdue';
            } else if (daysUntilDue <= 7) {
              scheduleStatus = 'Due Soon';
            }
          }
          
          return {
            ...debt,
            days_until_due: daysUntilDue,
            schedule_status: scheduleStatus
          };
        })
        .sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      
      filteredPayments = [...allPayments];
      
      console.log('Payment schedule processed:', allPayments.length, 'payments');
      
      // Update UI
      updateScheduleStats();
      renderPaymentList();
      
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error('Error loading payment schedule:', error);
      showErrorState(error.message || 'Failed to load payment schedule. Click retry to try again.');
    }
  }
  
  function showLoadingState() {
    // Don't replace the stat cards - just update their values to show loading
    const upcomingEl = document.getElementById('upcoming-count');
    const overdueEl = document.getElementById('overdue-count');
    const totalEl = document.getElementById('total-amount');
    const completedEl = document.getElementById('completed-count');
    
    if (upcomingEl) upcomingEl.textContent = '...';
    if (overdueEl) overdueEl.textContent = '...';
    if (totalEl) totalEl.textContent = '...';
    if (completedEl) completedEl.textContent = '...';
    
    const listEl = document.getElementById('schedule-list');
    if (listEl) {
      listEl.innerHTML = '<div class="loading-message">Loading payment schedule...</div>';
    } else {
      console.warn('schedule-list element not found');
    }
  }
  
  function showErrorState(message) {
    const listEl = document.getElementById('schedule-list');
    
    const isAuthError = message && (message.includes('Authentication') || message.includes('Session expired') || message.includes('403') || message.includes('401'));
    
    const errorHtml = isAuthError ? `
      <div class="error-message">
        <h3>🔒 Authentication Required</h3>
        <p>Your session has expired. Please log in again to continue.</p>
        <button onclick="window.location.href='/login.html'" class="btn-primary">Go to Login</button>
      </div>
    ` : `
      <div class="error-message">
        <h3>⚠️ Error Loading Payment Schedule</h3>
        <p>${message || 'Failed to load data'}</p>
        <button onclick="loadPaymentSchedule()" class="btn-primary">Retry</button>
      </div>
    `;
    
    // Reset stat values to 0 on error
    const upcomingEl = document.getElementById('upcoming-count');
    const overdueEl = document.getElementById('overdue-count');
    const totalEl = document.getElementById('total-amount');
    const completedEl = document.getElementById('completed-count');
    
    if (upcomingEl) upcomingEl.textContent = '0';
    if (overdueEl) overdueEl.textContent = '0';
    if (totalEl) totalEl.textContent = 'Ksh 0';
    if (completedEl) completedEl.textContent = '0';
    
    if (listEl) {
      listEl.innerHTML = errorHtml;
    } else {
      console.error('schedule-list element not found');
    }
  }
  
  // Helper functions
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  function updateScheduleStats() {
    const upcomingCount = allPayments.filter(payment => payment.schedule_status === 'Scheduled').length;
    const overdueCount = allPayments.filter(payment => payment.schedule_status === 'Overdue').length;
    const totalAmount = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const completedCount = allPayments.filter(payment => payment.status === 'paid').length;
    
    // Update individual stat elements
    const upcomingCountEl = document.getElementById('upcoming-count');
    const overdueCountEl = document.getElementById('overdue-count');
    const totalAmountEl = document.getElementById('total-amount');
    const completedCountEl = document.getElementById('completed-count');
    
    if (upcomingCountEl) upcomingCountEl.textContent = upcomingCount;
    if (overdueCountEl) overdueCountEl.textContent = overdueCount;
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
    if (completedCountEl) completedCountEl.textContent = completedCount;
  }
  
  function renderPaymentList() {
    const container = document.getElementById('schedule-list');
    
    // Filter payments based on current tab
    let tabPayments = filteredPayments;
    
    switch (currentTab) {
      case 'upcoming':
        tabPayments = filteredPayments.filter(payment => {
          if (!payment.due_date) return false;
          const dueDate = new Date(payment.due_date);
          const today = new Date();
          return dueDate >= today && payment.status !== 'paid';
        });
        break;
      case 'overdue':
        tabPayments = filteredPayments.filter(payment => {
          if (!payment.due_date) return false;
          const dueDate = new Date(payment.due_date);
          const today = new Date();
          return dueDate < today && payment.status !== 'paid';
        });
        break;
      case 'completed':
        tabPayments = filteredPayments.filter(payment => payment.status === 'paid');
        break;
    }
    
    if (tabPayments.length === 0) {
      const messages = {
        upcoming: 'No upcoming payments found',
        overdue: 'No overdue payments found',
        completed: 'No completed payments found'
      };
      
      container.innerHTML = `
        <div class="no-data-message">
          <h3>${messages[currentTab]}</h3>
          <p>${currentTab === 'upcoming' ? 'All payments are up to date!' : 'Check back later for updates.'}</p>
        </div>
      `;
      return;
    }
    
    // Sort payments by due date
    tabPayments.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    
    container.innerHTML = tabPayments.map(payment => {
      const dueDate = payment.due_date ? new Date(payment.due_date) : null;
      const today = new Date();
      const isOverdue = dueDate && dueDate < today && payment.status !== 'paid';
      const isDueToday = dueDate && dueDate.toDateString() === today.toDateString() && payment.status !== 'paid';
      const isCompleted = payment.status === 'paid';
      
      let statusClass = 'pending';
      let statusText = 'Pending';
      let icon = '⏰';
      
      if (isCompleted) {
        statusClass = 'completed';
        statusText = 'Completed';
        icon = '✅';
      } else if (isOverdue) {
        statusClass = 'overdue';
        statusText = 'Overdue';
        icon = '⚠️';
      } else if (isDueToday) {
        statusClass = 'due-today';
        statusText = 'Due Today';
        icon = '🚨';
      }
      
      return `
        <div class="payment-item ${statusClass}">
          <div class="payment-icon">${icon}</div>
          <div class="payment-info">
            <div class="payment-debtor">${payment.debtor_name || 'Unknown Debtor'}</div>
            <div class="payment-description">${payment.description || 'Payment due'}</div>
            <div class="payment-meta">
              <span>Reference: ${payment.reference_number || 'N/A'}</span>
              <span>Method: ${payment.payment_method || 'Not specified'}</span>
            </div>
          </div>
          <div class="payment-amount">${formatCurrency(payment.amount || 0)}</div>
          <div class="payment-due-date">${dueDate ? formatDate(dueDate) : 'Not set'}</div>
          <div class="payment-status ${statusClass}">${statusText}</div>
          <div class="payment-actions">
            ${!isCompleted ? `
              <button class="btn-small btn-primary" onclick="processPayment(${payment.id})">Process</button>
              <button class="btn-small btn-secondary" onclick="viewPaymentDetails(${payment.id})">View</button>
            ` : `
              <button class="btn-small btn-success" onclick="viewPaymentDetails(${payment.id})">View</button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
  
  function handleFilter() {
    const timeFilter = document.getElementById('time-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    filteredPayments = allPayments.filter(payment => {
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Time filter
      if (timeFilter !== 'all') {
        if (!payment.due_date) return false;
        const dueDate = new Date(payment.due_date);
        
        switch (timeFilter) {
          case 'today':
            if (dueDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            if (dueDate < today || dueDate > weekFromNow) return false;
            break;
          case 'month':
            if (dueDate < today || dueDate > monthFromNow) return false;
            break;
          case 'overdue':
            if (dueDate >= today || payment.status === 'paid') return false;
            break;
        }
      }
      
      // Status filter
      if (statusFilter) {
        const isOverdue = payment.due_date && new Date(payment.due_date) < today && payment.status !== 'paid';
        const isDueToday = payment.due_date && new Date(payment.due_date).toDateString() === today.toDateString() && payment.status !== 'paid';
        
        switch (statusFilter) {
          case 'pending':
            if (payment.status === 'paid' || isOverdue || isDueToday) return false;
            break;
          case 'due':
            if (!isDueToday) return false;
            break;
          case 'overdue':
            if (!isOverdue) return false;
            break;
          case 'paid':
            if (payment.status !== 'paid') return false;
            break;
        }
      }
      
      // Tab filter
      const isOverdue = payment.due_date && new Date(payment.due_date) < today && payment.status !== 'paid';
      const isDueToday = payment.due_date && new Date(payment.due_date).toDateString() === today.toDateString() && payment.status !== 'paid';
      const isUpcoming = payment.due_date && new Date(payment.due_date) > today && payment.status !== 'paid';
      
      switch (currentTab) {
        case 'upcoming':
          if (!isUpcoming) return false;
          break;
        case 'overdue':
          if (!isOverdue) return false;
          break;
        case 'completed':
          if (payment.status !== 'paid') return false;
          break;
      }
      
      return true;
    });
    
    renderPaymentList();
  }
  
  // Global functions
  window.clearFilters = function() {
    document.getElementById('time-filter').value = 'all';
    document.getElementById('status-filter').value = '';
    filteredPayments = [...allPayments];
    renderPaymentList();
    showNotification('Filters cleared', 'info');
  };
  
  window.goToReceivePayment = function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('Please log in to record payments', 'error');
      return;
    }
    
    // Navigate to receive payment page by simulating sidebar click
    const receivePaymentLink = document.getElementById('sidebar-receive-payment-debt');
    if (receivePaymentLink) {
      receivePaymentLink.click();
    } else {
      // Fallback: direct navigation
      window.location.href = '/dashboard/debt-management/receive-payment';
    }
  };
  
  window.exportSchedule = function() {
    try {
      // Prepare data for export
      const exportData = filteredPayments.map(payment => ({
        'Debtor Name': payment.debtor_name || 'N/A',
        'Amount': formatCurrency(payment.amount || 0),
        'Due Date': formatDate(payment.due_date),
        'Status': payment.schedule_status || 'Pending',
        'Days Until Due': payment.days_until_due || 0,
        'Description': payment.description || 'N/A',
        'Category': payment.category || 'N/A'
      }));
      
      // Convert to CSV
      const csvContent = convertToCSV(exportData);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payment-schedule-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('Payment schedule exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export schedule', 'error');
    }
  };
  
  window.refreshSchedule = function() {
    showNotification('Refreshing payment schedule...', 'info');
    loadPaymentSchedule();
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
    renderPaymentList();
    
    showNotification(`Switched to ${tab} payments`, 'info');
  };
  
  window.processPayment = function(id) {
    const payment = allPayments.find(p => p.id == id);
    if (!payment) {
      showNotification('Payment not found', 'error');
      return;
    }
    
    // Show payment processing modal
    showPaymentModal(payment, 'process');
  };
  
  window.viewPaymentDetails = function(id) {
    const payment = allPayments.find(p => p.id == id);
    if (!payment) {
      showNotification('Payment not found', 'error');
      return;
    }
    
    // Show payment details modal
    showPaymentModal(payment, 'view');
  };
  
  // Helper functions
  function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
  
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    notification.innerHTML = `${icons[type] || icons.info} ${message}`;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }
  
  function getUserIdFromToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      return decoded.id || decoded.userId || decoded.user_id;
    } catch (e) { return null; }
  }

  // M-Pesa support removed from payment schedule
  // async function initiateMpesaFromSchedule({ amount, phone, accountReference, userId, debtId, token }) {
  //   /* Removed: M-Pesa no longer supported */
  // }

  async function initiateKcbFromSchedule({ amount, phone, accountNumber, accountReference, userId, debtId, token }) {
    const payload = {
      phoneNumber: phone,
      amount,
      accountReference,
      transactionDesc: `Payment for DEBT-${debtId}`,
      accountNumber,
      userId,
      debtId
    };
    const res = await fetch('/api/kcb/initiate-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('KCB initiation failed');
    const data = await res.json();
    showNotification(data.developmentMode ? 'KCB initiated (Dev Mode)' : 'KCB payment initiated', 'success');
  }

  function showPaymentModal(payment, mode) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: #000000;
      border: 1px solid #ffffff;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
    `;
    
    if (mode === 'view') {
      modalContent.innerHTML = `
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="margin: 0; color: #ffffff;">Payment Details</h3>
          <button class="close-btn" style="background: none; border: none; color: #b0b0b0; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; gap: 1rem;">
            <div><strong>Debtor:</strong> ${payment.debtor_name || 'N/A'}</div>
            <div><strong>Amount:</strong> ${formatCurrency(payment.amount || 0)}</div>
            <div><strong>Due Date:</strong> ${formatDate(payment.due_date)}</div>
            <div><strong>Status:</strong> ${payment.schedule_status || 'Pending'}</div>
            <div><strong>Days Until Due:</strong> ${payment.days_until_due || 0}</div>
            <div><strong>Description:</strong> ${payment.description || 'N/A'}</div>
            <div><strong>Category:</strong> ${payment.category || 'N/A'}</div>
          </div>
        </div>
        <div class="modal-footer" style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn-secondary btn-small" id="view-close-btn">Close</button>
          <button class="btn-primary btn-small" onclick="processPayment(${payment.id})">Process Payment</button>
        </div>
      `;
    } else {
      // Compute status for badge (overdue / due today / pending)
      const dueDate = payment.due_date ? new Date(payment.due_date) : null;
      const today = new Date();
      const isCompleted = payment.status === 'paid';
      const isOverdue = !isCompleted && dueDate && dueDate < today;
      const isDueToday = !isCompleted && dueDate && dueDate.toDateString() === today.toDateString();
      let statusText = 'Pending';
      let statusStyle = 'background:#ffffff;color:#000;';
      if (isOverdue) { statusText = 'Overdue'; }
      else if (isDueToday) { statusText = 'Due Today'; }

      modalContent.innerHTML = `
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <h3 style="margin: 0; color: #ffffff;">Process Payment</h3>
            <span style="padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; ${statusStyle} border: 1px solid #ffffff;">${statusText}</span>
          </div>
          <button class="close-btn" style="background: none; border: none; color: #b0b0b0; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; gap: 1rem;">
            <div><strong>Debtor:</strong> ${payment.debtor_name || 'N/A'}</div>
            <div><strong>Amount Due:</strong> ${formatCurrency(payment.amount || 0)}</div>
            <div><strong>Due Date:</strong> ${formatDate(payment.due_date)}</div>
            <div style="margin-top: 0.5rem;">
              <label style="display: block; margin-bottom: 0.5rem;"><strong>Payment Amount:</strong></label>
              <input type="number" id="ps-amount" value="${payment.amount || 0}" style="width: 100%; padding: 0.75rem; background: #000; border: 1px solid #fff; border-radius: 6px; color: white;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem;"><strong>Payment Method:</strong></label>
              <select id="ps-method" style="width: 100%; padding: 0.75rem; background: #000; border: 1px solid #fff; border-radius: 6px; color: white;">
                 <option value="kcb">KCB Mobile Banking</option>
                 <option value="manual">Mark as Paid (Manual)</option>
               </select>
             </div>
             <!-- M-Pesa fields removed -->
             <div id="ps-kcb-fields" style="display: block;">
               <label style="display: block; margin-bottom: 0.5rem;"><strong>KCB Phone Number:</strong></label>
               <input type="tel" id="ps-kcb-phone" placeholder="e.g., 2547XXXXXXXX" style="width: 100%; padding: 0.75rem; background: #000; border: 1px solid #fff; border-radius: 6px; color: white; margin-bottom: 0.75rem;">
               <label style="display: block; margin-bottom: 0.5rem;"><strong>KCB Account Number:</strong></label>
               <input type="text" id="ps-kcb-account" placeholder="e.g., 1234567890" style="width: 100%; padding: 0.75rem; background: #000; border: 1px solid #fff; border-radius: 6px; color: white;">
             </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem;"><strong>Notes:</strong></label>
              <textarea id="ps-notes" rows="3" style="width: 100%; padding: 0.75rem; background: #000; border: 1px solid #fff; border-radius: 6px; color: white; resize: vertical;"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn-secondary btn-small" id="ps-cancel-btn">Cancel</button>
          <button class="btn-secondary btn-small" id="ps-initiate-btn">Initiate Payment</button>
          <button class="btn-primary btn-small" id="ps-confirm-btn">Mark as Paid</button>
        </div>
      `;
    }
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Wire up method switch and buttons (only for process mode)
    if (mode !== 'view') {
      const methodSelect = modal.querySelector('#ps-method');
      const kcbFields = modal.querySelector('#ps-kcb-fields');
      methodSelect.addEventListener('change', () => {
        const val = methodSelect.value;
        kcbFields.style.display = val === 'kcb' ? 'block' : 'none';
      });

      // Cancel button closes the modal
      const cancelBtn = modal.querySelector('#ps-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal());
      }

      const initiateBtn = modal.querySelector('#ps-initiate-btn');
      if (initiateBtn) {
        initiateBtn.addEventListener('click', async () => {
          try {
            const method = methodSelect.value;
            const amount = parseFloat(document.getElementById('ps-amount').value || 0);
            if (!amount || amount <= 0) { showNotification('Enter a valid amount', 'error'); return; }
            const token = localStorage.getItem('token');
            if (!token) { showNotification('Please log in', 'error'); return; }
            const userId = getUserIdFromToken(token);
            const accountReference = `DEBT-${payment.id}`;
            if (method === 'kcb') {
              const phone = (document.getElementById('ps-kcb-phone').value || '').trim();
              const account = (document.getElementById('ps-kcb-account').value || '').trim();
              if (!phone || !account) { showNotification('Enter KCB phone and account number', 'error'); return; }
              await initiateKcbFromSchedule({ amount, phone, accountNumber: account, accountReference, userId, debtId: payment.id, token });
            } else if (method === 'manual') {
              showNotification('Use the Mark as Paid button for manual processing', 'info');
              return;
            } else {
              showNotification('Select KCB to initiate or use Manual', 'info');
              return;
            }
          } catch (e) {
            console.error(e);
            showNotification('Failed to initiate payment', 'error');
          }
        });
      }

      const confirmBtn = modal.querySelector('#ps-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => { await confirmPayment(payment.id); });
      }
    }

    // View modal close button (header cross already wired above)
    const viewCloseBtn = modal.querySelector('#view-close-btn');
    if (viewCloseBtn) {
      viewCloseBtn.addEventListener('click', () => closeModal());
    }

    // Add escape key functionality
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Store modal reference and escape handler for cleanup
    window.currentModal = modal;
    window.currentModal.escapeHandler = handleEscape;
  }
  
  function closeModal() {
    if (window.currentModal) {
      // Remove escape key listener
      document.removeEventListener('keydown', window.currentModal.escapeHandler);
      
      // Remove modal from DOM
      document.body.removeChild(window.currentModal);
      window.currentModal = null;
    }
  }
  
  window.confirmPayment = function(paymentId) {
    const payment = allPayments.find(p => p.id == paymentId);
    if (!payment) {
      showNotification('Payment not found', 'error');
      return;
    }
    // Support both old and new modal field IDs
    const amountInput = document.getElementById('ps-amount') || document.getElementById('payment-amount');
    const methodSelect = document.getElementById('ps-method') || document.getElementById('payment-method');
    const notesInput = document.getElementById('ps-notes') || document.getElementById('payment-notes');
    const amount = amountInput ? amountInput.value : '';
    const method = methodSelect ? methodSelect.value : '';
    const notes = notesInput ? notesInput.value : '';
    
    if (!amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid payment amount', 'error');
      return;
    }
    
    // Prevent double submits
    const confirmBtn = document.getElementById('ps-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
    }
    
    showNotification('Processing payment and updating records...', 'info');
    
    // Process payment and delete debt
    processPaymentAndDeleteDebt(payment, amount, method, notes).finally(() => {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Mark as Paid';
      }
    });
  };
  
  async function processPaymentAndDeleteDebt(payment, amount, method, notes) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Step 1: Record the payment transaction
      const paymentData = {
        debt_id: payment.id,
        amount: parseFloat(amount),
        payment_method: method,
        notes: notes,
        payment_date: new Date().toISOString()
      };
      
      const paymentResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });
      
      if (!paymentResponse.ok) {
        throw new Error(`Failed to record payment: ${paymentResponse.status}`);
      }
      
      // Step 2: Delete the debt
      const deleteResponse = await fetch(`/api/debts/${payment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete debt: ${deleteResponse.status}`);
      }
      
      // Step 3: Update local data
      allPayments = allPayments.filter(p => p.id !== payment.id);
      filteredPayments = allPayments.filter(p => {
        // Re-apply current filters
        const today = new Date();
        const isOverdue = p.due_date && new Date(p.due_date) < today && p.status !== 'paid';
        const isDueToday = p.due_date && new Date(p.due_date).toDateString() === today.toDateString() && p.status !== 'paid';
        const isUpcoming = p.due_date && new Date(p.due_date) > today && p.status !== 'paid';
        
        switch (currentTab) {
          case 'upcoming':
            return isUpcoming;
          case 'overdue':
            return isOverdue;
          case 'completed':
            return p.status === 'paid';
          default:
            return true;
        }
      });
      
      // Step 4: Update statistics
      updateScheduleStats();
      
      // Step 5: Refresh display
      renderPaymentList();
      
      // Step 6: Close modal and show success
      closeModal();
      showNotification(`Payment of ${formatCurrency(amount)} processed and debt cleared successfully!`, 'success');
      
      // Step 7: Update other dashboard modules if they exist
      updateDashboardMetrics();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification(`Failed to process payment: ${error.message}`, 'error');
    }
  }
  
  function updateDashboardMetrics() {
    // Trigger updates in other dashboard modules
    if (window.analyticsModule && window.analyticsModule.loadAnalyticsData) {
      window.analyticsModule.loadAnalyticsData();
    }
    
    if (window.reportsModule && window.reportsModule.loadReportsData) {
      window.reportsModule.loadReportsData();
    }
    
    if (window.viewDebtsModule && window.viewDebtsModule.loadDebts) {
      window.viewDebtsModule.loadDebts();
    }
    
    if (window.debtCategoriesModule && window.debtCategoriesModule.loadCategories) {
      window.debtCategoriesModule.loadCategories();
    }
    
    // Show notification about data refresh
    setTimeout(() => {
      showNotification('Dashboard metrics updated with latest data', 'info');
    }, 1000);
  }
  
  // Make loadPaymentSchedule globally accessible
  window.loadPaymentSchedule = loadPaymentSchedule;
  
  // Global function to refresh payment schedule from other modules
  window.refreshPaymentSchedule = function() {
    console.log('Refreshing payment schedule from external trigger');
    loadPaymentSchedule();
  };
  
  // Export functions for external use
  window.paymentScheduleModule = {
    loadData: loadPaymentSchedule,
    refresh: loadPaymentSchedule,
    switchTab: switchTab,
    clearFilters: clearFilters,
    initializeInteractivity: function() {
      console.log('Payment Schedule module interactivity initialized');
      setupEventListeners();
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadPaymentSchedule();
      setupEventListeners();
    });
  } else {
    loadPaymentSchedule();
    setupEventListeners();
  }
  
})();
