// Record Credit Module Script
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
    document.getElementById('credit-date').value = new Date().toISOString().split('T')[0];
  }
  
  function setupFormValidation() {
    const form = document.getElementById('record-credit-form');
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
    const form = document.getElementById('record-credit-form');
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
        creditor_name: document.getElementById('credit-name').value.trim(),
        amount: parseFloat(document.getElementById('credit-amount').value),
        category: document.getElementById('credit-type').value,
        description: document.getElementById('credit-description').value.trim(),
        credit_limit: parseFloat(document.getElementById('credit-limit').value) || null,
        interest_rate: parseFloat(document.getElementById('interest-rate').value) || 0
      };
      
      console.log('Submitting credit:', formData);
      
      // Submit to API
      const result = await DashboardController.prototype.apiCall('/credits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      console.log('Credit created successfully:', result);
      
      // Show success message
      showSuccessMessage();
      
      // Reset form
      form.reset();
      initializeForm();
      
    } catch (error) {
      console.error('Error creating credit:', error);
      showFormError('Error creating credit: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  }
  
  function setFormLoading(loading) {
    const form = document.getElementById('record-credit-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (loading) {
      form.classList.add('form-loading');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Recording Credit...';
    } else {
      form.classList.remove('form-loading');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-icon">💾</span> Record Credit';
    }
  }
  
  function showSuccessMessage() {
    const form = document.getElementById('record-credit-form');
    const existingMessage = form.querySelector('.success-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
      <strong>✅ Success!</strong> Your credit has been recorded and added to the system.
    `;
    
    form.insertBefore(successMessage, form.firstChild);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 5000);
  }
  
  function showFormError(message) {
    const form = document.getElementById('record-credit-form');
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
  window.goToViewCredits = function() {
    DashboardController.prototype.loadModule('credit-management/view-credits');
    DashboardController.prototype.setActiveNavLink('sidebar-view-credits');
  };
  
  // Export functions for external use
  window.recordCreditModule = {
    resetForm: function() {
      document.getElementById('record-credit-form').reset();
      initializeForm();
    },
    validateForm: function() {
      const form = document.getElementById('record-credit-form');
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
