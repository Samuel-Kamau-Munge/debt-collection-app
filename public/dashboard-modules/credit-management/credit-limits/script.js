// Credit Limits Module Script
(function(modulePath, DashboardController) {
  'use strict';
  
  let limits = [];
  let credits = [];
  let history = [];
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    loadCreditLimits();
    setupFormSubmission();
    setupEventListeners();
  });
  
  function setupEventListeners() {
    // History filters
    const limitFilter = document.getElementById('history-limit-filter');
    const periodFilter = document.getElementById('history-period-filter');
    
    if (limitFilter) {
      limitFilter.addEventListener('change', handleHistoryFilter);
    }
    
    if (periodFilter) {
      periodFilter.addEventListener('change', handleHistoryFilter);
    }
  }
  
  async function loadCreditLimits() {
    try {
      console.log('Loading credit limits...');
      
      // Show loading state
      showLoadingState();
      
      // Fetch limits data
      const limitsData = await DashboardController.prototype.apiCall('/credits/limits').catch(err => {
        console.warn('Limits API failed:', err);
        return [];
      });
      
      // Fetch credits data for calculations
      const creditsData = await DashboardController.prototype.apiCall('/credits').catch(err => {
        console.warn('Credits API failed:', err);
        return [];
      });
      
      limits = limitsData || [];
      credits = creditsData || [];
      
      // Calculate usage for each limit
      limits.forEach(limit => {
        limit.usedAmount = calculateUsedAmount(limit);
        limit.usagePercentage = limit.limit_amount > 0 ? (limit.usedAmount / limit.limit_amount) * 100 : 0;
        limit.status = getLimitStatus(limit);
      });
      
      // Update UI
      updateLimitsStats();
      renderLimitsList();
      updateHistoryFilters();
      loadUsageHistory();
      
    } catch (error) {
      console.error('Error loading credit limits:', error);
      showErrorState('Failed to load credit limits');
    }
  }
  
  function calculateUsedAmount(limit) {
    const now = new Date();
    const startDate = new Date(limit.start_date);
    let endDate = limit.end_date ? new Date(limit.end_date) : new Date();
    
    // Adjust end date based on limit type
    if (!limit.end_date) {
      switch (limit.limit_type) {
        case 'daily':
          endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'yearly':
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
      }
    }
    
    return credits
      .filter(credit => {
        if (!credit.date) return false;
        const creditDate = new Date(credit.date);
        return creditDate >= startDate && creditDate <= endDate;
      })
      .filter(credit => {
        if (!limit.category) return true;
        return credit.type === limit.category;
      })
      .reduce((sum, credit) => sum + (credit.amount || 0), 0);
  }
  
  function getLimitStatus(limit) {
    if (limit.usagePercentage >= 100) return 'danger';
    if (limit.usagePercentage >= (limit.alert_threshold || 80)) return 'warning';
    return 'normal';
  }
  
  function showLoadingState() {
    document.getElementById('limits-stats').innerHTML = '<div class="loading-message">Loading credit limit statistics...</div>';
    document.getElementById('limits-grid').innerHTML = '<div class="loading-message">Loading credit limits...</div>';
    document.getElementById('history-list').innerHTML = '<div class="loading-message">Loading usage history...</div>';
  }
  
  function showErrorState(message) {
    document.getElementById('limits-stats').innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('limits-grid').innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('history-list').innerHTML = `<div class="error-message">${message}</div>`;
  }
  
  function updateLimitsStats() {
    const totalLimits = limits.length;
    const totalLimitAmount = limits.reduce((sum, limit) => sum + (limit.limit_amount || 0), 0);
    const totalUsedAmount = limits.reduce((sum, limit) => sum + limit.usedAmount, 0);
    const averageUsage = totalLimits > 0 ? (totalUsedAmount / totalLimitAmount) * 100 : 0;
    
    const warningLimits = limits.filter(limit => limit.status === 'warning').length;
    const dangerLimits = limits.filter(limit => limit.status === 'danger').length;
    
    document.getElementById('limits-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-content">
          <div class="stat-value">${totalLimits}</div>
          <div class="stat-label">Total Limits</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${DashboardController.prototype.formatCurrency(totalLimitAmount)}</div>
          <div class="stat-label">Total Limit</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">${averageUsage.toFixed(1)}%</div>
          <div class="stat-label">Avg Usage</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">${warningLimits + dangerLimits}</div>
          <div class="stat-label">Alerts</div>
        </div>
      </div>
    `;
  }
  
  function renderLimitsList() {
    const container = document.getElementById('limits-grid');
    
    if (limits.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>No Credit Limits Found</h3>
          <p>Create your first credit limit to get started.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = limits.map(limit => `
      <div class="limit-card ${limit.status}">
        <div class="limit-header">
          <div>
            <div class="limit-name">${limit.name || 'Unnamed Limit'}</div>
            <div class="limit-description">${limit.description || 'No description provided'}</div>
          </div>
          <div class="limit-type">${limit.limit_type || 'monthly'}</div>
        </div>
        
        <div class="limit-progress">
          <div class="progress-bar">
            <div class="progress-fill ${limit.status}" style="width: ${Math.min(limit.usagePercentage, 100)}%"></div>
          </div>
          <div class="progress-text">
            <span>${limit.usagePercentage.toFixed(1)}% used</span>
            <span>${limit.alert_threshold || 80}% alert</span>
          </div>
        </div>
        
        <div class="limit-amounts">
          <div class="amount-item">
            <span class="amount-value">${DashboardController.prototype.formatCurrency(limit.usedAmount)}</span>
            <span class="amount-label">Used</span>
          </div>
          <div class="amount-item">
            <span class="amount-value">${DashboardController.prototype.formatCurrency(limit.limit_amount || 0)}</span>
            <span class="amount-label">Limit</span>
          </div>
        </div>
        
        <div class="limit-dates">
          <span>Start: ${limit.start_date ? DashboardController.prototype.formatDate(limit.start_date) : 'N/A'}</span>
          <span>End: ${limit.end_date ? DashboardController.prototype.formatDate(limit.end_date) : 'Ongoing'}</span>
        </div>
        
        <div class="limit-actions">
          <button class="btn-small btn-primary" onclick="editLimit(${limit.id})">Edit</button>
          <button class="btn-small btn-secondary" onclick="viewLimitHistory(${limit.id})">History</button>
          <button class="btn-small btn-warning" onclick="resetLimit(${limit.id})">Reset</button>
          <button class="btn-small btn-danger" onclick="deleteLimit(${limit.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }
  
  function updateHistoryFilters() {
    const limitFilter = document.getElementById('history-limit-filter');
    if (limitFilter) {
      limitFilter.innerHTML = `
        <option value="">All Limits</option>
        ${limits.map(limit => `
          <option value="${limit.id}">${limit.name || 'Unnamed Limit'}</option>
        `).join('')}
      `;
    }
  }
  
  function loadUsageHistory() {
    // Mock history data - in real implementation, this would come from API
    history = [
      {
        id: 1,
        limit_id: 1,
        limit_name: 'Monthly Income',
        action: 'credit_added',
        amount: 50000,
        description: 'Salary payment received',
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: 2,
        limit_id: 1,
        limit_name: 'Monthly Income',
        action: 'limit_created',
        amount: 100000,
        description: 'Monthly income limit created',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ];
    
    renderUsageHistory();
  }
  
  function renderUsageHistory() {
    const container = document.getElementById('history-list');
    
    if (history.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>No History Found</h3>
          <p>Usage history will appear here as you use your credit limits.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = history.map(item => {
      const icon = item.action === 'credit_added' ? '💰' : 
                   item.action === 'limit_created' ? '➕' : 
                   item.action === 'limit_updated' ? '✏️' : '📊';
      
      return `
        <div class="history-item">
          <div class="history-icon">${icon}</div>
          <div class="history-info">
            <div class="history-limit">${item.limit_name}</div>
            <div class="history-description">${item.description}</div>
          </div>
          <div class="history-amount">${DashboardController.prototype.formatCurrency(item.amount)}</div>
          <div class="history-date">${DashboardController.prototype.formatDate(item.date)}</div>
        </div>
      `;
    }).join('');
  }
  
  function handleHistoryFilter() {
    const limitFilter = document.getElementById('history-limit-filter').value;
    const periodFilter = document.getElementById('history-period-filter').value;
    
    // Filter history based on selected filters
    let filteredHistory = [...history];
    
    if (limitFilter) {
      filteredHistory = filteredHistory.filter(item => item.limit_id == limitFilter);
    }
    
    if (periodFilter !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (periodFilter) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (cutoffDate) {
        filteredHistory = filteredHistory.filter(item => new Date(item.date) >= cutoffDate);
      }
    }
    
    // Re-render with filtered data
    const container = document.getElementById('history-list');
    if (filteredHistory.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>No History Found</h3>
          <p>No history matches your current filters.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filteredHistory.map(item => {
      const icon = item.action === 'credit_added' ? '💰' : 
                   item.action === 'limit_created' ? '➕' : 
                   item.action === 'limit_updated' ? '✏️' : '📊';
      
      return `
        <div class="history-item">
          <div class="history-icon">${icon}</div>
          <div class="history-info">
            <div class="history-limit">${item.limit_name}</div>
            <div class="history-description">${item.description}</div>
          </div>
          <div class="history-amount">${DashboardController.prototype.formatCurrency(item.amount)}</div>
          <div class="history-date">${DashboardController.prototype.formatDate(item.date)}</div>
        </div>
      `;
    }).join('');
  }
  
  function setupFormSubmission() {
    const form = document.getElementById('add-limit-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmission);
    }
  }
  
  async function handleFormSubmission(event) {
    event.preventDefault();
    
    // Show loading state
    setFormLoading(true);
    
    try {
      // Collect form data
      const formData = {
        name: document.getElementById('limit-name').value.trim(),
        limit_amount: parseFloat(document.getElementById('limit-amount').value),
        limit_type: document.getElementById('limit-type').value,
        category: document.getElementById('limit-category').value,
        description: document.getElementById('limit-description').value.trim(),
        start_date: document.getElementById('limit-start-date').value,
        end_date: document.getElementById('limit-end-date').value || null,
        alert_threshold: parseFloat(document.getElementById('limit-alert-threshold').value) || 80
      };
      
      console.log('Submitting credit limit:', formData);
      
      // Submit to API
      const result = await DashboardController.prototype.apiCall('/credits/limits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      console.log('Credit limit created successfully:', result);
      
      // Show success message
      showFormSuccess('Credit limit created successfully!');
      
      // Reset form
      document.getElementById('add-limit-form').reset();
      document.getElementById('limit-start-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('limit-alert-threshold').value = 80;
      
      // Hide form
      hideAddLimitForm();
      
      // Reload limits
      await loadCreditLimits();
      
    } catch (error) {
      console.error('Error creating credit limit:', error);
      showFormError('Error creating credit limit: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  }
  
  function setFormLoading(loading) {
    const form = document.getElementById('add-limit-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating...';
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-icon">💾</span> Add Limit';
    }
  }
  
  function showFormSuccess(message) {
    const form = document.getElementById('add-limit-form');
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `<strong>✅ Success!</strong> ${message}`;
    
    form.insertBefore(successMessage, form.firstChild);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 3000);
  }
  
  function showFormError(message) {
    const form = document.getElementById('add-limit-form');
    const existingMessage = form.querySelector('.error-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `<strong>❌ Error:</strong> ${message}`;
    
    form.insertBefore(errorMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      errorMessage.remove();
    }, 5000);
  }
  
  // Global functions
  window.showAddLimitForm = function() {
    document.getElementById('add-limit-section').style.display = 'block';
    document.getElementById('limit-name').focus();
    document.getElementById('limit-start-date').value = new Date().toISOString().split('T')[0];
  };
  
  window.hideAddLimitForm = function() {
    document.getElementById('add-limit-section').style.display = 'none';
    document.getElementById('add-limit-form').reset();
    document.getElementById('limit-start-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('limit-alert-threshold').value = 80;
    
    // Clear any messages
    const form = document.getElementById('add-limit-form');
    const existingMessage = form.querySelector('.success-message, .error-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  };
  
  window.editLimit = function(id) {
    console.log('Edit limit:', id);
    alert('Edit limit functionality will be implemented soon');
  };
  
  window.viewLimitHistory = function(id) {
    console.log('View limit history:', id);
    // Filter history to show only this limit
    document.getElementById('history-limit-filter').value = id;
    handleHistoryFilter();
  };
  
  window.resetLimit = function(id) {
    if (confirm('Are you sure you want to reset this limit? This will clear all usage data.')) {
      console.log('Reset limit:', id);
      alert('Reset limit functionality will be implemented soon');
    }
  };
  
  window.deleteLimit = function(id) {
    if (confirm('Are you sure you want to delete this credit limit? This action cannot be undone.')) {
      console.log('Delete limit:', id);
      alert('Delete limit functionality will be implemented soon');
    }
  };
  
  window.clearHistoryFilters = function() {
    document.getElementById('history-limit-filter').value = '';
    document.getElementById('history-period-filter').value = 'week';
    renderUsageHistory();
  };
  
  // Export functions for external use
  window.creditLimitsModule = {
    loadData: loadCreditLimits,
    refresh: loadCreditLimits,
    showAddForm: showAddLimitForm,
    hideAddForm: hideAddLimitForm
  };
  
})(modulePath, DashboardController);
