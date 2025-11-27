// Receive Payment Module Script
(function() {
  'use strict';
  
  let allDebts = [];
  let recentPayments = [];
  const REFRESH_INTERVAL_MS = 10000; // 10s
  let refreshTimer = null;
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadDebts();
    loadRecentPayments();
    setupEventListeners();
    startAutoRefresh();
  });
  
  function initializeForm() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-date').value = today;
    
    // Initialize form validation
    setupFormValidation();
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (!document.hidden) {
        loadDebts();
        loadRecentPayments();
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
      loadDebts();
      loadRecentPayments();
    }
  }
  
  function setupEventListeners() {
    const form = document.getElementById('receive-payment-form');
    const debtorSelect = document.getElementById('debtor-select');
    const debtSelect = document.getElementById('debt-select');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentMethod = document.getElementById('payment-method');
    
    if (form) {
      form.addEventListener('submit', handleFormSubmission);
    }
    
    if (debtorSelect) {
      debtorSelect.addEventListener('change', handleDebtorChange);
    }
    
    if (debtSelect) {
      debtSelect.addEventListener('change', handleDebtChange);
    }
    
    if (paymentAmount) {
      paymentAmount.addEventListener('input', updatePaymentSummary);
    }
    
    if (paymentMethod) {
      paymentMethod.addEventListener('change', handlePaymentMethodChange);
    }
  }
  
  function setupFormValidation() {
    const form = document.getElementById('receive-payment-form');
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    inputs.forEach(input => {
      input.addEventListener('blur', validateField);
      input.addEventListener('input', clearFieldError);
    });
  }
  
  function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    if (field.hasAttribute('required') && !value) {
      showFieldError(field, 'This field is required');
      return false;
    }
    
    if (field.type === 'number' && value && parseFloat(value) <= 0) {
      showFieldError(field, 'Amount must be greater than 0');
      return false;
    }
    
    clearFieldError(field);
    return true;
  }
  
  function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = '#dc3545';
  }
  
  function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    field.style.borderColor = '#444';
  }
  
  async function loadDebts() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/debts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      allDebts = data.debts || [];
      
      populateDebtorSelect();
      
    } catch (error) {
      console.error('Error loading debts:', error);
      showNotification('Failed to load debts: ' + error.message, 'error');
    }
  }
  
  function populateDebtorSelect() {
    const debtorSelect = document.getElementById('debtor-select');
    if (!debtorSelect) return;
    
    // Get unique debtors
    const debtors = [...new Set(allDebts.map(debt => debt.debtor_name).filter(Boolean))];
    
    debtorSelect.innerHTML = '<option value="">Choose a debtor...</option>';
    
    debtors.forEach(debtor => {
      const option = document.createElement('option');
      option.value = debtor;
      option.textContent = debtor;
      debtorSelect.appendChild(option);
    });
  }
  
  function handleDebtorChange() {
    const debtorSelect = document.getElementById('debtor-select');
    const debtSelect = document.getElementById('debt-select');
    
    if (!debtorSelect || !debtSelect) return;
    
    const selectedDebtor = debtorSelect.value;
    
    // Clear debt select
    debtSelect.innerHTML = '<option value="">Choose a debt...</option>';
    debtSelect.disabled = true;
    
    if (!selectedDebtor) {
      clearPaymentSummary();
      return;
    }
    
    // Filter debts for selected debtor
    const debtorDebts = allDebts.filter(debt => debt.debtor_name === selectedDebtor);
    
    if (debtorDebts.length === 0) {
      showNotification('No debts found for this debtor', 'info');
      return;
    }
    
    // Populate debt select
    debtorDebts.forEach(debt => {
      const option = document.createElement('option');
      option.value = debt.id;
      option.textContent = `${formatCurrency(debt.amount)} - ${debt.description || 'No description'} (Due: ${formatDate(debt.due_date)})`;
      debtSelect.appendChild(option);
    });
    
    debtSelect.disabled = false;
  }
  
  function handleDebtChange() {
    const debtSelect = document.getElementById('debt-select');
    const paymentAmount = document.getElementById('payment-amount');
    
    if (!debtSelect || !paymentAmount) return;
    
    const selectedDebtId = debtSelect.value;
    
    if (!selectedDebtId) {
      clearPaymentSummary();
      return;
    }
    
    // Find the selected debt
    const selectedDebt = allDebts.find(debt => debt.id == selectedDebtId);
    
    if (selectedDebt) {
      // Set payment amount to debt amount
      paymentAmount.value = selectedDebt.amount;
      updatePaymentSummary();
    }
  }
  
  function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('payment-method');
    const mpesaFields = document.getElementById('mpesa-fields');
    const kcbFields = document.getElementById('kcb-fields');
    const phoneNumber = document.getElementById('phone-number');
    const kcbPhoneNumber = document.getElementById('kcb-phone-number');
    const accountNumber = document.getElementById('account-number');
    
    if (!paymentMethod) return;
    
    // Hide all payment method specific fields
    if (mpesaFields) mpesaFields.style.display = 'none';
    if (kcbFields) kcbFields.style.display = 'none';
    if (phoneNumber) {
      phoneNumber.required = false;
      phoneNumber.value = '';
    }
    if (kcbPhoneNumber) {
      kcbPhoneNumber.required = false;
      kcbPhoneNumber.value = '';
    }
    if (accountNumber) {
      accountNumber.required = false;
      accountNumber.value = '';
    }
    
    // Show relevant fields based on selected payment method
    if (paymentMethod.value === 'mpesa') {
      // Removed: M-Pesa no longer supported
      if (mpesaFields) mpesaFields.style.display = 'none';
    } else if (paymentMethod.value === 'kcb') {
      if (kcbFields) kcbFields.style.display = 'block';
      if (kcbPhoneNumber) kcbPhoneNumber.required = true;
      if (accountNumber) accountNumber.required = true;
    }
  }
  
  function updatePaymentSummary() {
    const debtorSelect = document.getElementById('debtor-select');
    const debtSelect = document.getElementById('debt-select');
    const paymentAmount = document.getElementById('payment-amount');
    const paymentMethod = document.getElementById('payment-method');
    
    if (!debtorSelect || !debtSelect || !paymentAmount) return;
    
    const selectedDebtor = debtorSelect.value;
    const selectedDebtId = debtSelect.value;
    const paymentValue = parseFloat(paymentAmount.value) || 0;
    const selectedMethod = paymentMethod.value;
    
    // Update summary
    document.getElementById('summary-debtor').textContent = selectedDebtor || '-';
    document.getElementById('summary-payment-amount').textContent = paymentValue > 0 ? formatCurrency(paymentValue) : '-';
    document.getElementById('summary-method').textContent = selectedMethod || '-';
    
    if (selectedDebtId) {
      const selectedDebt = allDebts.find(debt => debt.id == selectedDebtId);
      if (selectedDebt) {
        document.getElementById('summary-debt-amount').textContent = formatCurrency(selectedDebt.amount);
        const remaining = selectedDebt.amount - paymentValue;
        document.getElementById('summary-remaining').textContent = formatCurrency(Math.max(0, remaining));
      }
    } else {
      document.getElementById('summary-debt-amount').textContent = '-';
      document.getElementById('summary-remaining').textContent = '-';
    }
  }
  
  function clearPaymentSummary() {
    document.getElementById('summary-debtor').textContent = '-';
    document.getElementById('summary-debt-amount').textContent = '-';
    document.getElementById('summary-payment-amount').textContent = '-';
    document.getElementById('summary-remaining').textContent = '-';
    document.getElementById('summary-method').textContent = '-';
  }
  
  async function handleFormSubmission(event) {
    event.preventDefault();
    
    // Validate form
    const form = event.target;
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!validateField({ target: input })) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
    
    try {
      const formData = {
        debt_id: document.getElementById('debt-select').value,
        amount: parseFloat(document.getElementById('payment-amount').value),
        payment_method: document.getElementById('payment-method').value,
        payment_date: document.getElementById('payment-date').value,
        reference_number: document.getElementById('reference-number').value,
        notes: document.getElementById('payment-notes').value
      };
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Get userId from token
      const userId = getUserIdFromToken(token);
      
      // Remove M-Pesa branch entirely
      // if (formData.payment_method === 'mpesa') { ... }
      
      // Handle KCB payments
      if (formData.payment_method === 'kcb') {
        const phoneNumber = document.getElementById('kcb-phone-number').value;
        const accountNumber = document.getElementById('account-number').value;
        if (!phoneNumber) {
          throw new Error('Phone number is required for KCB payments');
        }
        if (!accountNumber) {
          throw new Error('Account number is required for KCB payments');
        }
        await initiateKcbPayment(formData, phoneNumber, accountNumber, token, userId);
        return;
      }
      
      // For other payment methods (none), fall back to regular processing
      await processRegularPayment(formData, token);
    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification('Failed to process payment: ' + error.message, 'error');
    } finally {
      const submitBtn = event.target.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = originalText;
    }
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
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }
  
  // Remove M-Pesa related functions
  // async function initiateMpesaPayment(...) { /* removed */ }
  // async function pollMpesaPaymentStatus(...) { /* removed */ }
  
  async function initiateKcbPayment(formData, phoneNumber, accountNumber, token, userId) {
    try {
      // Get debt details for reference
      const selectedDebt = allDebts.find(debt => debt.id == formData.debt_id);
      const accountReference = `DEBT-${formData.debt_id}`;
      const transactionDesc = `Payment for ${selectedDebt?.debtor_name || 'debtor'}`;
      
      const kcbData = {
        phoneNumber: phoneNumber,
        amount: formData.amount,
        accountReference: accountReference,
        transactionDesc: transactionDesc,
        accountNumber: accountNumber,
        userId: userId,
        debtId: formData.debt_id
      };
      
      const response = await fetch('/api/kcb/initiate-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(kcbData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initiate KCB payment: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        if (result.developmentMode) {
          showNotification('KCB payment initiated (Development Mode)! Using mock credentials. Real payments will work once you get API credentials from KCB.', 'info');
        } else {
          showNotification('KCB payment initiated! Please check your phone and complete the payment.', 'info');
        }
        
        // Store payment data for later processing
        localStorage.setItem('pendingKcbPayment', JSON.stringify({
          ...formData,
          phoneNumber: phoneNumber,
          accountNumber: accountNumber,
          transactionRef: result.transactionRef,
          paymentId: result.paymentId
        }));
        
        // Start polling for payment status
        pollKcbPaymentStatus(result.transactionRef, token);
      } else {
        throw new Error(result.message || 'Failed to initiate KCB payment');
      }
      
    } catch (error) {
      console.error('Error initiating KCB payment:', error);
      throw error;
    }
  }
  
  async function pollKcbPaymentStatus(transactionRef, token) {
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch('/api/kcb/query-payment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ transactionRef })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to query payment status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'COMPLETED') {
          // Payment successful
          clearInterval(pollInterval);
          showNotification('KCB payment successful! Processing...', 'success');
          
          // Process the payment
          const pendingPayment = JSON.parse(localStorage.getItem('pendingKcbPayment') || '{}');
          if (pendingPayment.debt_id) {
            // Payment is already processed by callback, just refresh
            showNotification('KCB payment completed successfully!', 'success');
            localStorage.removeItem('pendingKcbPayment');
            // Reload debts and recent payments
            await loadDebts();
            await loadRecentPayments();
            // Reset form
            document.getElementById('receive-payment-form').reset();
            clearPaymentSummary();
          }
          
        } else if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          // Payment failed or cancelled
          clearInterval(pollInterval);
          showNotification('KCB payment was cancelled or failed', 'warning');
          localStorage.removeItem('pendingKcbPayment');
          
        } else if (attempts >= maxAttempts) {
          // Timeout
          clearInterval(pollInterval);
          showNotification('KCB payment timed out. Please try again.', 'error');
          localStorage.removeItem('pendingKcbPayment');
        }
        
      } catch (error) {
        console.error('Error polling KCB status:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          showNotification('Error checking payment status. Please contact support.', 'error');
        }
      }
    }, 10000); // Poll every 10 seconds
  }
  
  async function processRegularPayment(formData, token) {
    try {
      // Record the payment transaction
      const paymentResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!paymentResponse.ok) {
        throw new Error(`Failed to record payment: ${paymentResponse.status}`);
      }
      
      // Delete the debt (assuming full payment)
      const deleteResponse = await fetch(`/api/debts/${formData.debt_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to clear debt: ${deleteResponse.status}`);
      }
      
      // Show success message
      showNotification('Payment recorded successfully!', 'success');
      
      // Clear form
      clearPaymentForm();
      
      // Refresh data
      await loadDebts();
      await loadRecentPayments();
      
      // Update other modules
      updateDashboardModules();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      showNotification('Failed to record payment: ' + error.message, 'error');
    } finally {
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
  
  function clearPaymentForm() {
    const form = document.getElementById('receive-payment-form');
    form.reset();
    
    // Reset to initial state
    document.getElementById('debt-select').disabled = true;
    document.getElementById('debt-select').innerHTML = '<option value="">Choose a debt...</option>';
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('payment-date').value = today;
    
    clearPaymentSummary();
  }
  
  async function loadRecentPayments() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/transactions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      recentPayments = data.transactions || [];
      
      renderRecentPayments();
      
    } catch (error) {
      console.error('Error loading recent payments:', error);
      const container = document.getElementById('recent-payments-list');
      if (container) {
        container.innerHTML = '<div class="no-payments-message"><h4>Unable to load recent payments</h4><p>Please try again later</p></div>';
      }
    }
  }
  
  function renderRecentPayments() {
    const container = document.getElementById('recent-payments-list');
    if (!container) return;
    
    if (recentPayments.length === 0) {
      container.innerHTML = '<div class="no-payments-message"><h4>No recent payments</h4><p>Payments will appear here once recorded</p></div>';
      return;
    }
    
    // Show only last 5 payments
    const recent = recentPayments.slice(0, 5);
    
    container.innerHTML = recent.map(payment => `
      <div class="payment-item">
        <div class="payment-info">
          <div class="payment-debtor">${payment.debtor_name || 'Unknown Debtor'}</div>
          <div class="payment-details">
            ${formatDate(payment.transaction_date)} • ${payment.payment_method || 'Unknown Method'}
            ${payment.reference_number ? ` • Ref: ${payment.reference_number}` : ''}
          </div>
        </div>
        <div class="payment-amount">${formatCurrency(payment.amount)}</div>
      </div>
    `).join('');
  }
  
  function updateDashboardModules() {
    // Trigger updates in other dashboard modules
    if (window.refreshPaymentSchedule) {
      window.refreshPaymentSchedule();
    }
    
    if (window.analyticsModule && window.analyticsModule.loadAnalyticsData) {
      window.analyticsModule.loadAnalyticsData();
    }
    
    if (window.viewDebtsModule && window.viewDebtsModule.loadDebts) {
      window.viewDebtsModule.loadDebts();
    }
    
    if (window.debtCategoriesModule && window.debtCategoriesModule.loadCategories) {
      window.debtCategoriesModule.loadCategories();
    }
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
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Global functions
  window.clearPaymentForm = clearPaymentForm;
  window.refreshRecentPayments = loadRecentPayments;
  
  // Export functions for external use
  window.receivePaymentModule = {
    loadData: loadDebts,
    refresh: loadRecentPayments,
    initializeInteractivity: function() {
      console.log('Receive Payment module interactivity initialized');
      setupEventListeners();
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initializeForm();
      loadDebts();
      loadRecentPayments();
      setupEventListeners();
    });
  } else {
    initializeForm();
    loadDebts();
    loadRecentPayments();
    setupEventListeners();
  }
  
})();
