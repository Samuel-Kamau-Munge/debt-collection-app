// Make Payment Module Script
(function(modulePath, DashboardController) {
  'use strict';
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupFormValidation();
    setupFormSubmission();
  });
  
  function initializeForm() {
    // Set default date to today
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
  }
  
  function setupFormValidation() {
    const form = document.getElementById('make-payment-form');
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
  
  function setupFormSubmission() {
    const form = document.getElementById('make-payment-form');
    form.addEventListener('submit', handleFormSubmission);
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
        payee_name: document.getElementById('payee-name').value.trim(),
        amount: parseFloat(document.getElementById('payment-amount').value),
        payment_method: document.getElementById('payment-method').value,
        payment_date: document.getElementById('payment-date').value,
        reference_number: document.getElementById('payment-reference').value.trim(),
        category: document.getElementById('payment-category').value,
        notes: document.getElementById('payment-notes').value.trim()
      };
      
      console.log('Submitting payment:', formData);
      
      // Submit to API
      const result = await DashboardController.prototype.apiCall('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          type: 'payment_made',
          status: 'completed'
        })
      });
      
      console.log('Payment recorded successfully:', result);
      
      // Show success message
      showSuccessMessage('Payment recorded successfully!');
      
      // Reset form
      form.reset();
      initializeForm();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      showFormError('Error recording payment: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  }
  
  function setFormLoading(loading) {
    const form = document.getElementById('make-payment-form');
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
    const form = document.getElementById('make-payment-form');
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <strong>✅ Success!</strong> ${message}
    `;
    
    form.insertBefore(successMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 5000);
  }
  
  function showFormError(message) {
    const form = document.getElementById('make-payment-form');
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
  window.goToTransactionHistory = function() {
    DashboardController.prototype.loadModule('transaction-management/pending-transactions');
    DashboardController.prototype.setActiveNavLink('sidebar-transaction-history');
  };
  
  // Export functions for external use
  window.makePaymentModule = {
    resetForm: function() {
      document.getElementById('make-payment-form').reset();
      initializeForm();
    },
    validateForm: function() {
      const form = document.getElementById('make-payment-form');
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
  
})(modulePath, DashboardController);

