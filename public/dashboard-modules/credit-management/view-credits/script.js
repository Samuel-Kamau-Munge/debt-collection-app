// View Credits Module Script
(function(modulePath, DashboardController) {
  'use strict';
  
  let allCredits = [];
  let filteredCredits = [];
  let currentPage = 1;
  let totalPages = 1;
  const itemsPerPage = 10;
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    loadCredits();
    setupEventListeners();
  });
  
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Filter selects
    const typeFilter = document.getElementById('type-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (typeFilter) {
      typeFilter.addEventListener('change', handleFilter);
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', handleFilter);
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
  
  async function loadCredits() {
    try {
      console.log('Loading credits...');
      
      // Show loading state
      showLoadingState();
      
      // Fetch credits data
      const data = await DashboardController.prototype.apiCall('/credits').catch(err => {
        console.warn('Credits API failed:', err);
        return { credits: [] };
      });
      
      allCredits = data.credits || data || [];
      filteredCredits = [...allCredits];
      
      // Update UI
      updateCreditsStats();
      renderCreditsList();
      updatePagination();
      
    } catch (error) {
      console.error('Error loading credits:', error);
      showErrorState('Failed to load credits');
    }
  }
  
  function showLoadingState() {
    document.getElementById('credits-stats').innerHTML = '<div class="loading-message">Loading credit statistics...</div>';
    document.getElementById('credits-list').innerHTML = '<div class="loading-message">Loading credits...</div>';
  }
  
  function showErrorState(message) {
    document.getElementById('credits-stats').innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('credits-list').innerHTML = `<div class="error-message">${message}</div>`;
  }
  
  function updateCreditsStats() {
    const totalCredits = allCredits.length;
    const totalAmount = allCredits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
    const averageAmount = totalCredits > 0 ? totalAmount / totalCredits : 0;
    
    // Calculate by category
    const accountsPayable = allCredits.filter(credit => credit.category === 'accounts_payable').length;
    const creditLine = allCredits.filter(credit => credit.category === 'credit_line').length;
    const vendorCredit = allCredits.filter(credit => credit.category === 'vendor_credit').length;
    const loan = allCredits.filter(credit => credit.category === 'loan').length;
    
    document.getElementById('credits-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${totalCredits}</div>
          <div class="stat-label">Total Credits</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">${DashboardController.prototype.formatCurrency(totalAmount)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">${DashboardController.prototype.formatCurrency(averageAmount)}</div>
          <div class="stat-label">Average Amount</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">${accountsPayable}</div>
          <div class="stat-label">Accounts Payable</div>
        </div>
      </div>
    `;
  }
  
  function renderCreditsList() {
    const container = document.getElementById('credits-list');
    
    if (filteredCredits.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>No Credits Found</h3>
          <p>No credits match your current filters.</p>
          <a href="#" onclick="goToRecordCredit()">Record your first credit</a>
        </div>
      `;
      return;
    }
    
    // Calculate pagination
    totalPages = Math.ceil(filteredCredits.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageCredits = filteredCredits.slice(startIndex, endIndex);
    
    container.innerHTML = `
      <table class="credits-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pageCredits.map(credit => `
            <tr>
              <td>
                <div class="credit-info">
                  <div class="credit-name">${credit.creditor_name || 'Unnamed Credit'}</div>
                  <div class="credit-details">
                    ${credit.description || 'No description'}
                    ${credit.credit_limit ? ` • Limit: ${DashboardController.prototype.formatCurrency(credit.credit_limit)}` : ''}
                  </div>
                </div>
              </td>
              <td>
                <span class="credit-type ${credit.category || 'other'}">${credit.category || 'other'}</span>
              </td>
              <td>
                <div class="credit-amount">${DashboardController.prototype.formatCurrency(credit.amount || 0)}</div>
              </td>
              <td>
                <span class="credit-status ${credit.status || 'active'}">${credit.status || 'active'}</span>
              </td>
              <td>
                <div class="credit-date">${credit.created_at ? DashboardController.prototype.formatDate(credit.created_at) : 'N/A'}</div>
              </td>
              <td>
                <div class="credit-actions">
                  <button class="btn-small btn-primary" onclick="viewCredit(${credit.id})">View</button>
                  <button class="btn-small btn-secondary" onclick="editCredit(${credit.id})">Edit</button>
                  <button class="btn-small btn-danger" onclick="deleteCredit(${credit.id})">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  function updatePagination() {
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('page-info');
    
    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }
    
    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    applyFilters(searchTerm);
  }
  
  function handleFilter() {
    applyFilters();
  }
  
  function applyFilters(searchTerm = '') {
    const typeFilter = document.getElementById('type-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    filteredCredits = allCredits.filter(credit => {
      // Search filter
      if (searchTerm) {
        const searchableText = [
          credit.creditor_name || '',
          credit.description || '',
          credit.category || '',
          (credit.amount || 0).toString()
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Type filter
      if (typeFilter && credit.category !== typeFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter && credit.status !== statusFilter) {
        return false;
      }
      
      return true;
    });
    
    currentPage = 1;
    renderCreditsList();
    updatePagination();
  }
  
  // Global functions
  window.clearFilters = function() {
    document.getElementById('search-input').value = '';
    document.getElementById('type-filter').value = '';
    document.getElementById('status-filter').value = '';
    filteredCredits = [...allCredits];
    renderCreditsList();
    updatePagination();
  };
  
  window.goToRecordCredit = function() {
    DashboardController.prototype.loadModule('credit-management/record-credit');
    DashboardController.prototype.setActiveNavLink('sidebar-record-credit');
  };
  
  window.exportCredits = function() {
    alert('Export credits functionality will be implemented soon');
  };
  
  window.refreshCredits = function() {
    loadCredits();
  };
  
  window.previousPage = function() {
    if (currentPage > 1) {
      currentPage--;
      renderCreditsList();
      updatePagination();
    }
  };
  
  window.nextPage = function() {
    if (currentPage < totalPages) {
      currentPage++;
      renderCreditsList();
      updatePagination();
    }
  };
  
  window.viewCredit = async function(id) {
    try {
      const credit = await DashboardController.prototype.apiCall(`/credits/${id}`);
      showCreditModal(credit.credit, 'view');
    } catch (error) {
      console.error('Error fetching credit:', error);
      alert('Failed to load credit details');
    }
  };
  
  window.editCredit = async function(id) {
    try {
      const credit = await DashboardController.prototype.apiCall(`/credits/${id}`);
      showCreditModal(credit.credit, 'edit');
    } catch (error) {
      console.error('Error fetching credit:', error);
      alert('Failed to load credit details');
    }
  };
  
  window.deleteCredit = async function(id) {
    if (confirm('Are you sure you want to delete this credit? This action cannot be undone.')) {
      try {
        await DashboardController.prototype.apiCall(`/credits/${id}`, {
          method: 'DELETE'
        });
        alert('Credit deleted successfully');
        loadCredits(); // Refresh the list
      } catch (error) {
        console.error('Error deleting credit:', error);
        alert('Failed to delete credit');
      }
    }
  };
  
  // Credit modal functionality
  function showCreditModal(credit, mode = 'view') {
    const modal = document.createElement('div');
    modal.className = 'credit-modal-overlay';
    modal.innerHTML = `
      <div class="credit-modal">
        <div class="credit-modal-header">
          <h3>${mode === 'view' ? 'View Credit' : 'Edit Credit'}</h3>
          <button class="close-modal" onclick="closeCreditModal()">&times;</button>
        </div>
        <div class="credit-modal-content">
          ${mode === 'view' ? renderCreditView(credit) : renderCreditEdit(credit)}
        </div>
        <div class="credit-modal-footer">
          ${mode === 'view' ? 
            `<button class="btn-secondary" onclick="closeCreditModal()">Close</button>
             <button class="btn-primary" onclick="editCredit(${credit.id})">Edit</button>` :
            `<button class="btn-secondary" onclick="closeCreditModal()">Cancel</button>
             <button class="btn-primary" onclick="saveCredit(${credit.id})">Save Changes</button>`
          }
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }
  
  function renderCreditView(credit) {
    return `
      <div class="credit-details">
        <div class="credit-field">
          <label>Creditor Name:</label>
          <span>${credit.creditor_name || 'N/A'}</span>
        </div>
        <div class="credit-field">
          <label>Amount:</label>
          <span class="credit-amount">${DashboardController.prototype.formatCurrency(credit.amount || 0)}</span>
        </div>
        <div class="credit-field">
          <label>Credit Limit:</label>
          <span>${credit.credit_limit ? DashboardController.prototype.formatCurrency(credit.credit_limit) : 'N/A'}</span>
        </div>
        <div class="credit-field">
          <label>Category:</label>
          <span>${credit.category || 'N/A'}</span>
        </div>
        <div class="credit-field">
          <label>Status:</label>
          <span class="credit-status ${credit.status || 'active'}">${credit.status || 'active'}</span>
        </div>
        <div class="credit-field">
          <label>Interest Rate:</label>
          <span>${credit.interest_rate || 0}%</span>
        </div>
        <div class="credit-field">
          <label>Description:</label>
          <span>${credit.description || 'N/A'}</span>
        </div>
        <div class="credit-field">
          <label>Created:</label>
          <span>${credit.created_at ? DashboardController.prototype.formatDate(credit.created_at) : 'N/A'}</span>
        </div>
      </div>
    `;
  }
  
  function renderCreditEdit(credit) {
    return `
      <form id="credit-edit-form" class="credit-form">
        <div class="form-row">
          <div class="form-group">
            <label for="edit-creditor-name">Creditor Name *</label>
            <input type="text" id="edit-creditor-name" value="${credit.creditor_name || ''}" required>
          </div>
          <div class="form-group">
            <label for="edit-amount">Amount *</label>
            <input type="number" id="edit-amount" value="${credit.amount || ''}" step="0.01" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="edit-credit-limit">Credit Limit</label>
            <input type="number" id="edit-credit-limit" value="${credit.credit_limit || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label for="edit-category">Category *</label>
            <select id="edit-category" required>
              <option value="">Select Category</option>
              <option value="accounts_payable" ${credit.category === 'accounts_payable' ? 'selected' : ''}>Accounts Payable</option>
              <option value="credit_line" ${credit.category === 'credit_line' ? 'selected' : ''}>Credit Line</option>
              <option value="vendor_credit" ${credit.category === 'vendor_credit' ? 'selected' : ''}>Vendor Credit</option>
              <option value="loan" ${credit.category === 'loan' ? 'selected' : ''}>Loan</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="edit-interest-rate">Interest Rate (%)</label>
            <input type="number" id="edit-interest-rate" value="${credit.interest_rate || 0}" step="0.01" min="0" max="100">
          </div>
          <div class="form-group">
            <label for="edit-status">Status</label>
            <select id="edit-status">
              <option value="active" ${credit.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${credit.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="closed" ${credit.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="edit-description">Description</label>
          <textarea id="edit-description" rows="3">${credit.description || ''}</textarea>
        </div>
      </form>
    `;
  }
  
  window.closeCreditModal = function() {
    const modal = document.querySelector('.credit-modal-overlay');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  };
  
  window.saveCredit = async function(creditId) {
    try {
      const form = document.getElementById('credit-edit-form');
      const formData = {
        creditor_name: document.getElementById('edit-creditor-name').value,
        amount: parseFloat(document.getElementById('edit-amount').value),
        credit_limit: parseFloat(document.getElementById('edit-credit-limit').value) || null,
        category: document.getElementById('edit-category').value,
        interest_rate: parseFloat(document.getElementById('edit-interest-rate').value),
        description: document.getElementById('edit-description').value,
        status: document.getElementById('edit-status').value
      };
      
      await DashboardController.prototype.apiCall(`/credits/${creditId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      alert('Credit updated successfully');
      closeCreditModal();
      loadCredits(); // Refresh the list
    } catch (error) {
      console.error('Error updating credit:', error);
      alert('Failed to update credit');
    }
  };

  // Export functions for external use
  window.viewCreditsModule = {
    loadData: loadCredits,
    refresh: loadCredits,
    clearFilters: clearFilters
  };
  
})(modulePath, DashboardController);

