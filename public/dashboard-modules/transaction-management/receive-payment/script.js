// Receive Payment Module Script
(function() {
  'use strict';
  
  let allDebts = [];
  let selectedDebts = [];
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadDebts();
    setupEventListeners();
  });
  
  function initializeForm() {
    // Set default date to today
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
  }
  
  function setupEventListeners() {
    // Debtor name autocomplete
    const debtorNameInput = document.getElementById('debtor-name');
    if (debtorNameInput) {
      debtorNameInput.addEventListener('input', handleDebtorSearch);
      debtorNameInput.addEventListener('blur', hideSuggestions);
    }
    
    // Debt search
    const debtSearchInput = document.getElementById('debt-search');
    if (debtSearchInput) {
      debtSearchInput.addEventListener('input', debounce(handleDebtSearch, 300));
    }
    
    // Payment amount change
    const paymentAmountInput = document.getElementById('payment-amount');
    if (paymentAmountInput) {
      paymentAmountInput.addEventListener('input', updatePaymentSummary);
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
  
  async function loadDebts() {
    try {
      console.log('Loading debts for payment...');
      
      // Show loading state
      showLoadingState();
      
      // Fetch debts data
      const data = await window.DashboardController.prototype.apiCall('/debts').catch(err => {
        console.warn('Debts API failed:', err);
        return [];
      });
      
      allDebts = data || [];
      
      // Update UI
      renderDebtsList();
      
    } catch (error) {
      console.error('Error loading debts:', error);
      showErrorState('Failed to load debts');
    }
  }
  
  function showLoadingState() {
    document.getElementById('debts-list').innerHTML = '<div class="loading-message">Loading debts...</div>';
  }
  
  function showErrorState(message) {
    document.getElementById('debts-list').innerHTML = `<div class="error-message">${message}</div>`;
  }
  
  function renderDebtsList(debts = allDebts) {
    const container = document.getElementById('debts-list');
    
    if (debts.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>No Debts Found</h3>
          <p>No debts match your search criteria.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = debts.map(debt => `
      <div class="debt-item" data-debt-id="${debt.id}">
        <input type="checkbox" class="debt-checkbox" onchange="toggleDebtSelection(${debt.id})">
        <div class="debt-info">
          <div class="debt-name">${debt.debtor_name || 'Unknown Debtor'}</div>
          <div class="debt-details">
            ${debt.description || 'No description'} • ${debt.category || 'Uncategorized'}
            ${debt.reference_number ? ` • Ref: ${debt.reference_number}` : ''}
          </div>
          <div class="debt-amount">${window.DashboardController.prototype.formatCurrency(debt.amount || 0)}</div>
        </div>
        <div class="debt-status ${debt.status || 'active'}">${debt.status || 'active'}</div>
      </div>
    `).join('');
  }
  
  function handleDebtorSearch() {
    const searchTerm = document.getElementById('debtor-name').value.toLowerCase();
    const suggestions = document.getElementById('debtor-suggestions');
    
    if (searchTerm.length < 2) {
      suggestions.style.display = 'none';
      return;
    }
    
    // Find matching debtors
    const matchingDebtors = allDebts
      .filter(debt => debt.debtor_name && debt.debtor_name.toLowerCase().includes(searchTerm))
      .slice(0, 5)
      .map(debt => ({
        name: debt.debtor_name,
        amount: debt.amount,
        status: debt.status
      }));
    
    if (matchingDebtors.length === 0) {
      suggestions.style.display = 'none';
      return;
    }
    
    suggestions.innerHTML = matchingDebtors.map(debtor => `
      <div class="suggestion-item" onclick="selectDebtor('${debtor.name}')">
        <div class="suggestion-name">${debtor.name}</div>
        <div class="suggestion-details">${window.DashboardController.prototype.formatCurrency(debtor.amount)} • ${debtor.status}</div>
      </div>
    `).join('');
    
    suggestions.style.display = 'block';
  }
  
  function hideSuggestions() {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      document.getElementById('debtor-suggestions').style.display = 'none';
    }, 200);
  }
  
  function selectDebtor(name) {
    document.getElementById('debtor-name').value = name;
    document.getElementById('debtor-suggestions').style.display = 'none';
    
    // Filter debts for this debtor
    const debtorDebts = allDebts.filter(debt => 
      debt.debtor_name && debt.debtor_name.toLowerCase() === name.toLowerCase()
    );
    renderDebtsList(debtorDebts);
  }
  
  function handleDebtSearch() {
    const searchTerm = document.getElementById('debt-search').value.toLowerCase();
    
    if (!searchTerm) {
      renderDebtsList(allDebts);
      return;
    }
    
    const filteredDebts = allDebts.filter(debt => {
      const searchableText = [
        debt.debtor_name || '',
        debt.description || '',
        debt.reference_number || '',
        debt.category || '',
        (debt.amount || 0).toString()
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
    
    renderDebtsList(filteredDebts);
  }
  
  function toggleDebtSelection(debtId) {
    const debtItem = document.querySelector(`[data-debt-id="${debtId}"]`);
    const checkbox = debtItem.querySelector('.debt-checkbox');
    
    if (checkbox.checked) {
      selectedDebts.push(debtId);
      debtItem.classList.add('selected');
    } else {
      selectedDebts = selectedDebts.filter(id => id !== debtId);
      debtItem.classList.remove('selected');
    }
    
    updatePaymentSummary();
  }
  
  function updatePaymentSummary() {
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const selectedDebtsAmount = selectedDebts.reduce((sum, debtId) => {
      const debt = allDebts.find(d => d.id === debtId);
      return sum + (debt ? debt.amount : 0);
    }, 0);
    
    // Show payment summary if there are selected debts
    if (selectedDebts.length > 0) {
      showPaymentSummary(paymentAmount, selectedDebtsAmount);
    } else {
      hidePaymentSummary();
    }
  }
  
  function showPaymentSummary(paymentAmount, selectedDebtsAmount) {
    let summaryContainer = document.getElementById('payment-summary');
    
    if (!summaryContainer) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'payment-summary';
      summaryContainer.className = 'payment-summary';
      document.querySelector('.debt-selection').appendChild(summaryContainer);
    }
    
    const remainingAmount = Math.max(0, selectedDebtsAmount - paymentAmount);
    
    summaryContainer.innerHTML = `
      <h4>Payment Summary</h4>
      <div class="summary-row">
        <span class="summary-label">Selected Debts:</span>
        <span class="summary-value">${selectedDebts.length} debt(s)</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Debt Amount:</span>
        <span class="summary-value">${window.DashboardController.prototype.formatCurrency(selectedDebtsAmount)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Payment Amount:</span>
        <span class="summary-value">${window.DashboardController.prototype.formatCurrency(paymentAmount)}</span>
      </div>
      <div class="summary-row summary-total">
        <span class="summary-label">Remaining:</span>
        <span class="summary-value">${window.DashboardController.prototype.formatCurrency(remainingAmount)}</span>
      </div>
    `;
  }
  
  function hidePaymentSummary() {
    const summaryContainer = document.getElementById('payment-summary');
    if (summaryContainer) {
      summaryContainer.remove();
    }
  }
  
  // Form submission
  document.getElementById('receive-payment-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Show loading state
    setFormLoading(true);
    
    try {
      // Collect form data
      const formData = {
        debtor_name: document.getElementById('debtor-name').value.trim(),
        amount: parseFloat(document.getElementById('payment-amount').value),
        payment_method: document.getElementById('payment-method').value,
        payment_date: document.getElementById('payment-date').value,
        reference_number: document.getElementById('payment-reference').value.trim(),
        notes: document.getElementById('payment-notes').value.trim(),
        debt_ids: selectedDebts
      };
      
      console.log('Submitting payment:', formData);
      
      // Submit to API
      const result = await window.DashboardController.prototype.apiCall('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          type: 'payment_received',
          status: 'completed'
        })
      });
      
      console.log('Payment recorded successfully:', result);
      
      // Show success message
      showSuccessMessage('Payment recorded successfully!');
      
      // Reset form
      resetForm();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      showFormError('Error recording payment: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  });
  
  function validateForm() {
    const debtorName = document.getElementById('debtor-name').value.trim();
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const paymentMethod = document.getElementById('payment-method').value;
    const paymentDate = document.getElementById('payment-date').value;
    
    if (!debtorName) {
      showFormError('Debtor name is required');
      return false;
    }
    
    if (!amount || amount <= 0) {
      showFormError('Valid payment amount is required');
      return false;
    }
    
    if (!paymentMethod) {
      showFormError('Payment method is required');
      return false;
    }
    
    if (!paymentDate) {
      showFormError('Payment date is required');
      return false;
    }
    
    if (selectedDebts.length === 0) {
      showFormError('Please select at least one debt');
      return false;
    }
    
    return true;
  }
  
  function setFormLoading(loading) {
    const form = document.getElementById('receive-payment-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (loading) {
      form.classList.add('form-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Recording Payment...';
    } else {
      form.classList.remove('form-loading');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-icon">💾</span> Record Payment';
    }
  }
  
  function showSuccessMessage(message) {
    const form = document.getElementById('receive-payment-form');
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `<strong>✅ Success!</strong> ${message}`;
    
    form.insertBefore(successMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 5000);
  }
  
  function showFormError(message) {
    const form = document.getElementById('receive-payment-form');
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
  
  function resetForm() {
    document.getElementById('receive-payment-form').reset();
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    selectedDebts = [];
    renderDebtsList();
    hidePaymentSummary();
    
    // Clear any messages
    const form = document.getElementById('receive-payment-form');
    const existingMessage = form.querySelector('.success-message, .error-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  }
  
  // Global functions
  window.toggleDebtSelection = toggleDebtSelection;
  window.selectDebtor = selectDebtor;
  
  window.goToTransactionHistory = function() {
      window.DashboardController.prototype.loadModule('transaction-management/pending-transactions');
    window.DashboardController.prototype.setActiveNavLink('sidebar-transaction-history');
  };
  
  // Export functions for external use
  window.receivePaymentModule = {
    loadData: loadDebts,
    resetForm: resetForm,
    validateForm: validateForm
  };
  
})();
