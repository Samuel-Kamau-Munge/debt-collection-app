// Fixed View Credits Module Script
(function() {
  'use strict';
  
  console.log('🚀 Fixed View Credits Script Loaded');
  
  let allCredits = [];
  let filteredCredits = [];
  
  // Initialize immediately
  function initializeModule() {
    console.log('🎯 Initializing View Credits Module');
    loadCredits();
    setupEventListeners();
  }
  
  // Load credits data
  async function loadCredits() {
    try {
      console.log('🔄 Loading credits data...');
      
      // Show loading state
      showLoadingState();
      
      // Fetch credits data directly
      const response = await fetch('/api/credits', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Credits data loaded:', data);
      
      allCredits = data.credits || [];
      filteredCredits = [...allCredits];
      
      console.log('💾 Processed credits:', allCredits.length, 'credits');
      
      // Update UI
      updateCreditsStats();
      renderCreditsList();
      
      console.log('✅ UI updated successfully');
      
    } catch (error) {
      console.error('❌ Error loading credits:', error);
      showErrorState(error.message);
    }
  }
  
  function showLoadingState() {
    const statsElement = document.getElementById('credits-stats');
    const listElement = document.getElementById('credits-list');
    
    if (statsElement) {
      statsElement.innerHTML = '<div class="loading-message">Loading credit statistics...</div>';
    }
    if (listElement) {
      listElement.innerHTML = '<div class="loading-message">Loading credits...</div>';
    }
  }
  
  function showErrorState(message) {
    const statsElement = document.getElementById('credits-stats');
    const listElement = document.getElementById('credits-list');
    
    if (statsElement) {
      statsElement.innerHTML = `<div class="error-message">Error: ${message}</div>`;
    }
    if (listElement) {
      listElement.innerHTML = `<div class="error-message">Error: ${message}</div>`;
    }
  }
  
  function updateCreditsStats() {
    console.log('📊 Updating credit statistics...');
    
    const totalCredits = allCredits.length;
    const totalAmount = allCredits.reduce((sum, credit) => sum + parseFloat(credit.amount || 0), 0);
    const totalLimit = allCredits.reduce((sum, credit) => sum + parseFloat(credit.credit_limit || 0), 0);
    const activeCount = allCredits.filter(credit => credit.status === 'active').length;
    
    console.log('📊 Stats:', { totalCredits, totalAmount, totalLimit, activeCount });
    
    // Update stat elements
    const totalCreditsElement = document.getElementById('total-credits');
    const totalAmountElement = document.getElementById('total-amount');
    const totalLimitElement = document.getElementById('total-limit');
    const activeCountElement = document.getElementById('active-count');
    
    if (totalCreditsElement) totalCreditsElement.textContent = totalCredits;
    if (totalAmountElement) totalAmountElement.textContent = formatCurrency(totalAmount);
    if (totalLimitElement) totalLimitElement.textContent = formatCurrency(totalLimit);
    if (activeCountElement) activeCountElement.textContent = activeCount;
  }
  
  function renderCreditsList() {
    console.log('📋 Rendering credits list...');
    
    const listElement = document.getElementById('credits-list');
    if (!listElement) {
      console.error('❌ Credits list element not found');
      return;
    }
    
    if (filteredCredits.length === 0) {
      listElement.innerHTML = '<div class="no-data-message">No credits found</div>';
      return;
    }
    
    const creditsHTML = filteredCredits.map(credit => `
      <div class="credit-card">
        <div class="credit-header">
          <h3>${escapeHtml(credit.creditor_name || 'Unknown')}</h3>
          <span class="credit-status status-${credit.status || 'active'}">${credit.status || 'active'}</span>
        </div>
        <div class="credit-details">
          <div class="credit-amount">Used: ${formatCurrency(credit.amount || 0)}</div>
          <div class="credit-limit">Limit: ${formatCurrency(credit.credit_limit || 0)}</div>
          ${credit.due_date ? `<div class="credit-due-date">Due: ${formatDate(credit.due_date)}</div>` : ''}
          ${credit.description ? `<div class="credit-description">${escapeHtml(credit.description)}</div>` : ''}
        </div>
        <div class="credit-actions">
          <button class="btn-small" onclick="viewCredit(${credit.id})">View</button>
          <button class="btn-small" onclick="editCredit(${credit.id})">Edit</button>
          <button class="btn-small" onclick="recordCreditPayment(${credit.id})">Payment</button>
        </div>
      </div>
    `).join('');
    
    listElement.innerHTML = creditsHTML;
    console.log('✅ Credits list rendered');
  }
  
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
    }
    
    // Filter selects
    const statusFilter = document.getElementById('status-filter');
    const typeFilter = document.getElementById('type-filter');
    
    if (statusFilter) {
      statusFilter.addEventListener('change', handleFilter);
    }
    
    if (typeFilter) {
      typeFilter.addEventListener('change', handleFilter);
    }
  }
  
  function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    filteredCredits = allCredits.filter(credit => 
      (credit.creditor_name && credit.creditor_name.toLowerCase().includes(searchTerm)) ||
      (credit.description && credit.description.toLowerCase().includes(searchTerm)) ||
      (credit.amount && credit.amount.toString().includes(searchTerm))
    );
    renderCreditsList();
  }
  
  function handleFilter() {
    const statusFilter = document.getElementById('status-filter')?.value;
    const typeFilter = document.getElementById('type-filter')?.value;
    
    filteredCredits = allCredits.filter(credit => {
      const statusMatch = !statusFilter || credit.status === statusFilter;
      const typeMatch = !typeFilter || credit.type === typeFilter;
      return statusMatch && typeMatch;
    });
    
    renderCreditsList();
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
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModule);
  } else {
    console.log('🎯 DOM already loaded - Initializing immediately');
    initializeModule();
  }
  
  // Also initialize immediately
  setTimeout(initializeModule, 100);
  
})();


