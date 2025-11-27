// Record Debt Module Script
(function() {
  'use strict';
  
  // Module initialization
  function initializeModule() {
    initializeForm();
    setupFormValidation();
    setupFormSubmission();
  }
  
  // Initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModule);
  } else {
    initializeModule();
  }
  
  // Expose module for external initialization
  window.recordDebtModule = {
    initialize: initializeModule
  };
  
  function initializeForm() {
    // Set default due date to 30 days from now
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    document.getElementById('due-date').value = defaultDueDate.toISOString().split('T')[0];
    
    // Load debt categories
    loadDebtCategories();
  }
  
  async function loadDebtCategories() {
    try {
      const response = await fetch('/api/debts/categories/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const categories = await response.json();
      
      // Update category select if needed
      const categorySelect = document.getElementById('category');
      if (categories.length > 0) {
        // Add dynamic categories if any
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.category;
          option.textContent = cat.category;
          categorySelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  function setupFormValidation() {
    const form = document.getElementById('record-debt-form');
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
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
      showFieldError(field, 'Please enter a valid email address');
      return false;
    }
    
    if (field.type === 'tel' && value && !isValidPhone(value)) {
      showFieldError(field, 'Please enter a valid phone number');
      return false;
    }
    
    if (field.type === 'number' && value && parseFloat(value) < 0) {
      showFieldError(field, 'Please enter a positive number');
      return false;
    }
    
    clearFieldError(event);
    return true;
  }
  
  function clearFieldError(event) {
    const field = event.target;
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
    field.style.borderColor = '#e9ecef';
  }
  
  function showFieldError(field, message) {
    clearFieldError({ target: field });
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.style.color = '#dc3545';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.textContent = message;
    
    field.parentNode.appendChild(errorElement);
    field.style.borderColor = '#dc3545';
  }
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
  
  function setupFormSubmission() {
    const form = document.getElementById('record-debt-form');
    form.addEventListener('submit', handleFormSubmission);
  }
  
  // Unified authenticated API call wrapper with graceful fallback
  async function authenticatedApiCall(endpoint, options = {}) {
    try {
      if (window.dashboardController && typeof window.dashboardController.apiCall === 'function') {
        return await window.dashboardController.apiCall(endpoint, options);
      }
    } catch (e) {
      console.warn('dashboardController.apiCall failed, falling back to direct fetch:', e);
    }
    
    const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login';
      throw new Error('No authentication token');
    }
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    return await response.json();
  }
  
  async function handleFormSubmission(event) {
    event.preventDefault();
    
    // Validate all fields
    const form = event.target;
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!validateField({ target: input })) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      showFormError('Please fix the errors above before submitting');
      return;
    }
    
    // Show loading state
    setFormLoading(true);
    
    try {
      // Collect form data
      const formData = {
        debtor_name: document.getElementById('debtor-name').value.trim(),
        debtor_email: document.getElementById('debtor-email').value.trim(),
        debtor_phone: document.getElementById('debtor-phone').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        interest_rate: parseFloat(document.getElementById('interest-rate').value) || 0,
        due_date: document.getElementById('due-date').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.trim(),
        payment_terms: document.getElementById('payment-terms').value,
        notes: document.getElementById('notes').value.trim(),
        reference_number: document.getElementById('reference-number').value.trim()
      };
      
      console.log('Submitting debt:', formData);

      // Submit to API using authenticated call
      const result = await authenticatedApiCall('/debts', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      console.log('Debt created successfully:', result);
      
      // Show success message
      showSuccessMessage();
      
      // Reset form
      form.reset();
      initializeForm();
      
      // Refresh other dashboard modules
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
      
    } catch (error) {
      console.error('Error creating debt:', error);
      showFormError('Error creating debt: ' + (error && error.message ? error.message : String(error)));
    } finally {
      setFormLoading(false);
    }
  }
  
  function setFormLoading(loading) {
    const form = document.getElementById('record-debt-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (loading) {
      form.classList.add('form-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Recording Debt...';
    } else {
      form.classList.remove('form-loading');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-icon">💾</span> Record Debt';
    }
  }
  
  function showSuccessMessage() {
    const form = document.getElementById('record-debt-form');
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <strong>✅ Success!</strong> Your debt has been recorded and added to the system.
    `;
    
    form.insertBefore(successMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 5000);
  }
  
  function showFormError(message) {
    const form = document.getElementById('record-debt-form');
    const existingMessage = form.querySelector('.error-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
      <strong>❌ Error:</strong> ${message}
    `;
    
    form.insertBefore(errorMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      errorMessage.remove();
    }, 5000);
  }
  
  // Global functions
  window.goToViewDebts = function() {
    DashboardController.prototype.loadModule('debt-management/payment-schedule');
    DashboardController.prototype.setActiveNavLink('sidebar-payment-schedule');
  };
  
  // Export functions for external use
  window.recordDebtModule = {
    resetForm: function() {
      document.getElementById('record-debt-form').reset();
      initializeForm();
    },
    validateForm: function() {
      const form = document.getElementById('record-debt-form');
      const inputs = form.querySelectorAll('input[required], select[required]');
      let isValid = true;
      
      inputs.forEach(input => {
        if (!validateField({ target: input })) {
          isValid = false;
        }
      });
      
      return isValid;
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initializeForm();
      setupFormValidation();
      setupFormSubmission();
    });
  } else {
    initializeForm();
    setupFormValidation();
    setupFormSubmission();
  }
  
})();
