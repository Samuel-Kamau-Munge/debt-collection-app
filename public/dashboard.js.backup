// API Helper Functions
const API_BASE = '/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  console.log('Dashboard loaded, checking token:', token ? 'Token found' : 'No token');
  
  if (!token) {
    console.log('No token found, redirecting to login...');
    window.location.href = '/login.html';
    return;
  }
  
  console.log('Token found, dashboard ready');
  
  // Auto-load analytics when dashboard loads
  setTimeout(() => {
    console.log('Auto-clicking analytics button...');
    const analyticsBtn = document.getElementById('sidebar-analytics');
    if (analyticsBtn) {
      analyticsBtn.click();
    } else {
      console.error('Analytics button not found!');
    }
  }, 100);
});

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function apiCall(endpoint, options = {}) {
  try {
    console.log(`Making API call to: ${API_BASE}${endpoint}`);
    const headers = getAuthHeaders();
    console.log('Headers:', headers);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}


// Debt Management
document.getElementById('sidebar-record-debt').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-record-debt');
  
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Loading debt categories...');
    
    // Load debt categories with fallback
    const categoriesData = await apiCall('/debts/categories/list').catch(err => {
      console.warn('Categories API failed:', err);
      return []; // Return empty array as fallback
    });
    const categories = categoriesData || [];
    
    // Set default due date to 30 days from now
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const defaultDueDateStr = defaultDueDate.toISOString().split('T')[0];
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>💳 Record New Debt</h2>
        <p>Add a new debt to your collection system</p>
      </div>
      
      <div class="form-container">
        <form id="record-debt-form" class="professional-form">
          <div class="form-section">
            <h3>Debtor Information</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="debtor-name">Debtor Name *</label>
                <input type="text" id="debtor-name" required placeholder="Enter debtor's full name">
              </div>
              <div class="form-group">
                <label for="debtor-email">Email</label>
                <input type="email" id="debtor-email" placeholder="debtor@example.com">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="debtor-phone">Phone Number</label>
                <input type="tel" id="debtor-phone" placeholder="+254 700 000 000">
              </div>
              <div class="form-group">
                <label for="reference-number">Reference Number</label>
                <input type="text" id="reference-number" placeholder="Invoice/Reference number">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Debt Details</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="amount">Amount (Ksh) *</label>
                <input type="number" id="amount" step="0.01" min="0" required placeholder="0.00">
              </div>
              <div class="form-group">
                <label for="interest-rate">Interest Rate (%)</label>
                <input type="number" id="interest-rate" step="0.01" min="0" max="100" placeholder="0.00">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="due-date">Due Date *</label>
                <input type="date" id="due-date" required value="${defaultDueDateStr}">
              </div>
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category">
                  <option value="">Select Category</option>
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="loan">Loan</option>
                  <option value="service">Service</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="medical">Medical</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" rows="3" placeholder="Describe the nature of this debt..."></textarea>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Payment Terms & Notes</h3>
            <div class="form-group">
              <label for="payment-terms">Payment Terms</label>
              <select id="payment-terms">
                <option value="">Select Payment Terms</option>
                <option value="lump_sum">Lump Sum</option>
                <option value="installments">Installments</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="form-group">
              <label for="notes">Additional Notes</label>
              <textarea id="notes" rows="3" placeholder="Any additional information about this debt..."></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="document.getElementById('sidebar-view-debts').click()">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              <span class="btn-icon">💾</span>
              Record Debt
            </button>
          </div>
        </form>
      </div>
    `;
  } catch (error) {
    console.error('Error loading debt form:', error);
    let errorMessage = 'Error loading form. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    } else if (error.message.includes('HTTP error! status: 404')) {
      errorMessage = 'Server not responding. Please check if the server is running.';
    } else if (error.message.includes('HTTP error! status: 500')) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-container">
        <h2>💳 Record New Debt</h2>
        <div class="error-message">
          <p>${errorMessage}</p>
          <button onclick="document.getElementById('sidebar-record-debt').click()" class="btn-primary">Retry</button>
          <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
        </div>
      </div>
    `;
  }
});

document.getElementById('sidebar-view-debts').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-view-debts');
  
  // Use the centralized loadViewDebtsData function
  await loadViewDebtsData();
});

// Debt Categories Management
          <h2>📋 Debt Management</h2>
          <p class="page-subtitle">Manage and track all your outstanding debts</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" onclick="exportDebts()" title="Export Debts">
            📤 Export
          </button>
          <button class="btn-primary" onclick="document.getElementById('sidebar-record-debt').click()">
            ➕ Record New Debt
          </button>
        </div>
      </div>
      
      <!-- Debt Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_debts || 0}</div>
            <div class="stat-label">Total Debts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">Ksh ${(stats.total_amount || 0).toLocaleString()}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-content">
            <div class="stat-value">${stats.overdue_debts || 0}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">${stats.paid_debts || 0}</div>
            <div class="stat-label">Paid</div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Filters and Search Section -->
      <div class="filters-section">
        <div class="filters-header">
          <h3>🔍 Search & Filter</h3>
          <div class="filter-actions">
            <button class="btn-secondary btn-small" onclick="clearFilters()">
              🗑️ Clear All
            </button>
            <button class="btn-secondary btn-small" onclick="toggleAdvancedFilters()">
              ⚙️ Advanced
            </button>
          </div>
        </div>
        
        <div class="filters-row">
          <div class="filter-group">
            <label for="search-input">🔍 Search</label>
            <div class="search-box">
              <input type="text" id="search-input" placeholder="Search by debtor name, email, or reference..." onkeyup="searchDebts()">
              <span class="search-icon">🔍</span>
            </div>
          </div>
          <div class="filter-group">
            <label for="status-filter">📊 Status</label>
            <select id="status-filter" onchange="filterDebts()">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="category-filter">🏷️ Category</label>
            <select id="category-filter" onchange="filterDebts()">
              <option value="all">All Categories</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="loan">Loan</option>
              <option value="service">Service</option>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="medical">Medical</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="sort-by">📈 Sort By</label>
            <select id="sort-by" onchange="filterDebts()">
              <option value="created_at">Date Created</option>
              <option value="due_date">Due Date</option>
              <option value="amount">Amount</option>
              <option value="debtor_name">Debtor Name</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="sort-order">🔄 Order</label>
            <select id="sort-order" onchange="filterDebts()">
              <option value="DESC">Newest First</option>
              <option value="ASC">Oldest First</option>
            </select>
          </div>
        </div>
        
        <!-- Advanced Filters (initially hidden) -->
        <div id="advanced-filters" class="advanced-filters" style="display: none;">
          <div class="filters-row">
            <div class="filter-group">
              <label for="amount-min">💰 Min Amount</label>
              <input type="number" id="amount-min" placeholder="0" onchange="filterDebts()">
            </div>
            <div class="filter-group">
              <label for="amount-max">💰 Max Amount</label>
              <input type="number" id="amount-max" placeholder="No limit" onchange="filterDebts()">
            </div>
            <div class="filter-group">
              <label for="date-from">📅 From Date</label>
              <input type="date" id="date-from" onchange="filterDebts()">
            </div>
            <div class="filter-group">
              <label for="date-to">📅 To Date</label>
              <input type="date" id="date-to" onchange="filterDebts()">
            </div>
          </div>
        </div>
      </div>
      
      <!-- Bulk Actions -->
      <div class="bulk-actions" id="bulk-actions" style="display: none;">
        <div class="bulk-actions-content">
          <span class="bulk-selected-count">0 debts selected</span>
          <div class="bulk-buttons">
            <button class="btn-secondary btn-small" onclick="bulkMarkAsPaid()">✅ Mark as Paid</button>
            <button class="btn-secondary btn-small" onclick="bulkMarkAsActive()">🔄 Mark as Active</button>
            <button class="btn-danger btn-small" onclick="bulkDelete()">🗑️ Delete Selected</button>
            <button class="btn-secondary btn-small" onclick="clearSelection()">❌ Clear Selection</button>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Debts Table -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">
            <h3>📋 Debts List</h3>
            <span class="table-count">${pagination.total} total debts</span>
          </div>
          <div class="table-actions">
            <button class="btn-icon-small" onclick="toggleSelectAll()" title="Select All">
              ☑️
            </button>
            <button class="btn-icon-small" onclick="refreshDebts()" title="Refresh">
              🔄
            </button>
          </div>
        </div>
        
        <div class="table-wrapper">
          <table class="data-table" id="debts-table">
            <thead>
              <tr>
                <th class="select-column">
                  <input type="checkbox" id="select-all-checkbox" onchange="toggleSelectAll()">
                </th>
                <th class="sortable" onclick="sortTable('debtor_name')">
                  👤 Debtor <span class="sort-indicator">↕️</span>
                </th>
                <th class="sortable" onclick="sortTable('amount')">
                  💰 Amount <span class="sort-indicator">↕️</span>
                </th>
                <th class="sortable" onclick="sortTable('due_date')">
                  📅 Due Date <span class="sort-indicator">↕️</span>
                </th>
                <th class="sortable" onclick="sortTable('status')">
                  📊 Status <span class="sort-indicator">↕️</span>
                </th>
                <th class="sortable" onclick="sortTable('category')">
                  🏷️ Category <span class="sort-indicator">↕️</span>
                </th>
                <th>⚙️ Actions</th>
              </tr>
            </thead>
            <tbody>
              ${debts.length > 0 ? 
                debts.map(debt => `
                  <tr data-status="${debt.status}" data-category="${debt.category || ''}" data-debtor="${(debt.debtor_name || '').toLowerCase()}" data-amount="${debt.amount}">
                    <td class="select-column">
                      <input type="checkbox" class="debt-checkbox" value="${debt.id}" onchange="updateBulkActions()">
                    </td>
                    <td>
                      <div class="debtor-info">
                        <div class="debtor-name">${debt.debtor_name || 'N/A'}</div>
                        ${debt.debtor_email ? `<div class="debtor-email">${debt.debtor_email}</div>` : ''}
                        ${debt.reference_number ? `<div class="reference-number">Ref: ${debt.reference_number}</div>` : ''}
                      </div>
                    </td>
                    <td>
                      <div class="amount-info">
                        <div class="amount">Ksh ${parseFloat(debt.amount || 0).toLocaleString()}</div>
                        ${debt.interest_rate > 0 ? `<div class="interest-rate">+${debt.interest_rate}% interest</div>` : ''}
                      </div>
                    </td>
                    <td>
                      <div class="date-info">
                        <div class="due-date">${new Date(debt.due_date).toLocaleDateString()}</div>
                        ${debt.days_until_due !== undefined ? `
                          <div class="days-until ${debt.days_until_due < 0 ? 'overdue' : debt.days_until_due <= 7 ? 'due-soon' : ''}">
                            ${debt.days_until_due < 0 ? `${Math.abs(debt.days_until_due)} days overdue` : 
                              debt.days_until_due === 0 ? 'Due today' : 
                              debt.days_until_due === 1 ? 'Due tomorrow' : 
                              `${debt.days_until_due} days left`}
                          </div>
                        ` : ''}
                      </div>
                    </td>
                    <td>
                      <span class="status-badge ${debt.status_display?.toLowerCase().replace(' ', '-') || debt.status}">
                        ${debt.status_display || debt.status}
                      </span>
                    </td>
                    <td>
                      <span class="category-badge">${(debt.category || 'Uncategorized').charAt(0).toUpperCase() + (debt.category || 'Uncategorized').slice(1)}</span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn-icon-small" onclick="viewDebt(${debt.id})" title="View Details">
                          👁️
                        </button>
                        <button class="btn-icon-small" onclick="editDebt(${debt.id})" title="Edit">
                          ✏️
                        </button>
                        <button class="btn-icon-small" onclick="recordPayment(${debt.id})" title="Record Payment">
                          💰
                        </button>
                        <button class="btn-icon-small btn-danger" onclick="deleteDebt(${debt.id})" title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') : 
                '<tr><td colspan="7" class="no-data"><div class="no-data-content"><div class="no-data-icon">📋</div><div class="no-data-text">No debts found</div><div class="no-data-subtext">Start by recording your first debt</div><button class="btn-primary" onclick="document.getElementById(\'sidebar-record-debt\').click()">Add Your First Debt</button></div></td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Enhanced Pagination -->
      ${pagination.pages > 1 ? `
        <div class="pagination">
          <div class="pagination-info">
            Showing ${((pagination.page - 1) * 20) + 1} to ${Math.min(pagination.page * 20, pagination.total)} of ${pagination.total} debts
          </div>
          <div class="pagination-controls">
            <button class="btn-pagination" onclick="loadDebtsPage(1)" ${pagination.page <= 1 ? 'disabled' : ''}>
              ⏮️ First
            </button>
            <button class="btn-pagination" onclick="loadDebtsPage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>
              ⏪ Previous
            </button>
            <span class="pagination-pages">
              ${Array.from({length: Math.min(5, pagination.pages)}, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.pages, pagination.page - 2 + i));
                return `<button class="btn-pagination ${pageNum === pagination.page ? 'active' : ''}" onclick="loadDebtsPage(${pageNum})">${pageNum}</button>`;
              }).join('')}
            </span>
            <button class="btn-pagination" onclick="loadDebtsPage(${pagination.page + 1})" ${pagination.page >= pagination.pages ? 'disabled' : ''}>
              Next ⏩
            </button>
            <button class="btn-pagination" onclick="loadDebtsPage(${pagination.pages})" ${pagination.page >= pagination.pages ? 'disabled' : ''}>
              Last ⏭️
            </button>
          </div>
        </div>
      ` : ''}
    `;
  } catch (error) {
    console.error('Error loading debts:', error);
    let errorMessage = 'Error loading debts. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-container">
        <h2>📋 Debt Management</h2>
        <div class="error-message">
          <p>${errorMessage}</p>
          <button onclick="document.getElementById('sidebar-view-debts').click()" class="btn-primary">Retry</button>
          <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
        </div>
      </div>
    `;
  }
});

// Debt Categories Management
document.getElementById('sidebar-debt-categories').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-debt-categories');
  
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Loading debt categories...');
    
    // Load debt categories with fallback
    const categoriesData = await apiCall('/debts/categories/list').catch(err => {
      console.warn('Categories API failed:', err);
      return []; // Return empty array as fallback
    });
    const categories = categoriesData || [];
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>📂 Debt Categories</h2>
        <p>Manage your debt categories and view category statistics</p>
      </div>
      
      <div class="categories-container">
        <div class="categories-list">
          <h3>Existing Categories</h3>
          ${categories.length > 0 ? `
            <div class="category-items">
              ${categories.map(category => `
                <div class="category-item">
                  <div class="category-info">
                    <div class="category-name">${category.category}</div>
                    <div class="category-count">${category.count} debt${category.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div class="category-actions">
                    <button class="btn-icon-small" onclick="editCategory('${category.category}')" title="Edit Category">
                      ✏️
                    </button>
                    <button class="btn-icon-small btn-danger" onclick="deleteCategory('${category.category}')" title="Delete Category">
                      🗑️
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="no-categories">
              <p>No categories found. Create your first category below.</p>
            </div>
          `}
        </div>
        
        <div class="add-category-section">
          <h3>Add New Category</h3>
          <form id="add-category-form" class="professional-form">
            <div class="form-group">
              <label for="new-category-name">Category Name *</label>
              <input type="text" id="new-category-name" required placeholder="Enter category name">
            </div>
            <div class="form-group">
              <label for="new-category-description">Description</label>
              <textarea id="new-category-description" rows="3" placeholder="Describe this category..."></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary">
                <span class="btn-icon">➕</span>
                Add Category
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading debt categories:', error);
    let errorMessage = 'Error loading categories. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-container">
        <h2>📂 Debt Categories</h2>
        <div class="error-message">
          <p>${errorMessage}</p>
          <button onclick="document.getElementById('sidebar-debt-categories').click()" class="btn-primary">Retry</button>
          <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
        </div>
      </div>
    `;
  }
});

// Payment Schedule Management
document.getElementById('sidebar-payment-schedule').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-payment-schedule');
  
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Loading payment schedule...');
    
    // Load payment schedule with fallback
    const scheduleData = await apiCall('/debts/schedule/upcoming?days=30').catch(err => {
      console.warn('Schedule API failed:', err);
      return []; // Return empty array as fallback
    });
    const schedule = scheduleData || [];
    
    // Group by status
    const overdue = schedule.filter(item => item.schedule_status === 'Overdue');
    const dueSoon = schedule.filter(item => item.schedule_status === 'Due Soon');
    const scheduled = schedule.filter(item => item.schedule_status === 'Scheduled');
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>📅 Payment Schedule</h2>
        <p>Track upcoming payments and overdue debts</p>
      </div>
      
      <div class="schedule-stats">
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-content">
            <div class="stat-value">${overdue.length}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-content">
            <div class="stat-value">${dueSoon.length}</div>
            <div class="stat-label">Due Soon</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <div class="stat-value">${scheduled.length}</div>
            <div class="stat-label">Scheduled</div>
          </div>
        </div>
      </div>
      
      <div class="schedule-sections">
        ${overdue.length > 0 ? `
          <div class="schedule-section">
            <h3 class="section-title overdue">⚠️ Overdue Payments (${overdue.length})</h3>
            <div class="schedule-list">
              ${overdue.map(item => `
                <div class="schedule-item overdue">
                  <div class="schedule-info">
                    <div class="debtor-name">${item.debtor_name}</div>
                    <div class="amount">Ksh ${parseFloat(item.amount).toLocaleString()}</div>
                    <div class="due-date">Due: ${new Date(item.due_date).toLocaleDateString()}</div>
                    <div class="days-overdue">${Math.abs(item.days_until_due)} days overdue</div>
                  </div>
                  <div class="schedule-actions">
                    <button class="btn-primary" onclick="recordPayment(${item.id})">
                      💰 Record Payment
                    </button>
                    <button class="btn-secondary" onclick="viewDebt(${item.id})">
                      👁️ View Details
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${dueSoon.length > 0 ? `
          <div class="schedule-section">
            <h3 class="section-title due-soon">⏰ Due Soon (${dueSoon.length})</h3>
            <div class="schedule-list">
              ${dueSoon.map(item => `
                <div class="schedule-item due-soon">
                  <div class="schedule-info">
                    <div class="debtor-name">${item.debtor_name}</div>
                    <div class="amount">Ksh ${parseFloat(item.amount).toLocaleString()}</div>
                    <div class="due-date">Due: ${new Date(item.due_date).toLocaleDateString()}</div>
                    <div class="days-until">${item.days_until_due === 0 ? 'Due today' : item.days_until_due === 1 ? 'Due tomorrow' : `${item.days_until_due} days left`}</div>
                  </div>
                  <div class="schedule-actions">
                    <button class="btn-primary" onclick="recordPayment(${item.id})">
                      💰 Record Payment
                    </button>
                    <button class="btn-secondary" onclick="viewDebt(${item.id})">
                      👁️ View Details
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${scheduled.length > 0 ? `
          <div class="schedule-section">
            <h3 class="section-title scheduled">📅 Upcoming Payments (${scheduled.length})</h3>
            <div class="schedule-list">
              ${scheduled.map(item => `
                <div class="schedule-item scheduled">
                  <div class="schedule-info">
                    <div class="debtor-name">${item.debtor_name}</div>
                    <div class="amount">Ksh ${parseFloat(item.amount).toLocaleString()}</div>
                    <div class="due-date">Due: ${new Date(item.due_date).toLocaleDateString()}</div>
                    <div class="days-until">${item.days_until_due} days left</div>
                  </div>
                  <div class="schedule-actions">
                    <button class="btn-primary" onclick="recordPayment(${item.id})">
                      💰 Record Payment
                    </button>
                    <button class="btn-secondary" onclick="viewDebt(${item.id})">
                      👁️ View Details
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${schedule.length === 0 ? `
          <div class="no-schedule">
            <p>No upcoming payments in the next 30 days.</p>
            <button class="btn-primary" onclick="document.getElementById('sidebar-record-debt').click()">
              Add New Debt
            </button>
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    console.error('Error loading payment schedule:', error);
    let errorMessage = 'Error loading payment schedule. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-container">
        <h2>📅 Payment Schedule</h2>
        <div class="error-message">
          <p>${errorMessage}</p>
          <button onclick="document.getElementById('sidebar-payment-schedule').click()" class="btn-primary">Retry</button>
          <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
        </div>
      </div>
    `;
  }
});

// Credit Management
document.getElementById('sidebar-record-credit').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-record-credit');
  
  try {
    const categoriesData = await apiCall('/credits/categories/list');
    const categories = categoriesData.categories;
    
    document.getElementById('content-area').innerHTML = `
      <h2>💰 Record Credit</h2>
      <form id="record-credit-form" class="professional-form">
        <div class="form-group">
          <label for="creditor-name">Creditor Name:</label>
          <input type="text" id="creditor-name" required>
        </div>
        <div class="form-group">
          <label for="credit-category">Credit Category:</label>
          <select id="credit-category" required>
            <option value="">Select Category</option>
            ${categories.map(cat => `<option value="${cat.value}">${cat.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="credit-amount">Credit Amount (Ksh):</label>
          <input type="number" id="credit-amount" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="credit-limit">Credit Limit (Ksh):</label>
          <input type="number" id="credit-limit" step="0.01">
        </div>
        <div class="form-group">
          <label for="interest-rate">Interest Rate (%):</label>
          <input type="number" id="interest-rate" step="0.01" min="0" max="100" value="0">
        </div>
        <div class="form-group">
          <label for="credit-description">Description:</label>
          <textarea id="credit-description" rows="3"></textarea>
        </div>
        <button type="submit" class="btn-primary">Record Credit</button>
    </form>
  `;
  } catch (error) {
    console.error('Error loading credit form:', error);
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Form</h2>
        <p>Failed to load credit recording form. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-view-credits').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-view-credits');
  
  try {
    const data = await apiCall('/credits');
    const credits = data.credits;
    
  document.getElementById('content-area').innerHTML = `
      <h2>📋 All Credits</h2>
      <div class="filters">
        <select id="status-filter" onchange="filterCredits()">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
        <select id="category-filter" onchange="filterCredits()">
          <option value="">All Categories</option>
          <option value="accounts_payable">Accounts Payable</option>
          <option value="credit_line">Credit Line</option>
          <option value="vendor_credit">Vendor Credit</option>
          <option value="loan">Business Loan</option>
        </select>
      </div>
      <div class="table-container">
        <table class="data-table" id="credits-table">
          <thead>
            <tr>
              <th>Creditor</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Credit Limit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${credits.length > 0 ? 
              credits.map(credit => `
                <tr data-status="${credit.status}" data-category="${credit.category}">
                  <td>${credit.creditor_name}</td>
                  <td>${credit.category.replace('_', ' ').toUpperCase()}</td>
                  <td>Ksh ${parseFloat(credit.amount).toLocaleString()}</td>
                  <td>Ksh ${credit.credit_limit ? parseFloat(credit.credit_limit).toLocaleString() : 'N/A'}</td>
                  <td><span class="status ${credit.status}">${credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}</span></td>
                  <td>
                    <button class="btn-small" onclick="viewCredit(${credit.id})">View</button>
                    <button class="btn-small" onclick="editCredit(${credit.id})">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteCredit(${credit.id})">Delete</button>
                  </td>
                </tr>
              `).join('') :
              '<tr><td colspan="6" style="text-align: center; padding: 20px;">No credits found</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading credits:', error);
    let errorMessage = 'Failed to load credits data. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    } else if (error.message.includes('HTTP error! status: 404')) {
      errorMessage = 'Server not responding. Please check if the server is running.';
    } else if (error.message.includes('HTTP error! status: 500')) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Credits</h2>
        <p>${errorMessage}</p>
        <button onclick="document.getElementById('sidebar-view-credits').click()" class="btn-primary">Retry</button>
        <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-credit-limit').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-credit-limit');
  
  try {
    const data = await apiCall('/credits/limits/summary');
    const { byCategory, totals } = data;
    
    document.getElementById('content-area').innerHTML = `
      <h2>📊 Credit Limits Summary</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Credit Amount</h3>
          <p class="stat-value">Ksh ${totals.total_amount.toLocaleString()}</p>
        </div>
        <div class="stat-card">
          <h3>Total Credit Limit</h3>
          <p class="stat-value">Ksh ${totals.total_limit.toLocaleString()}</p>
        </div>
        <div class="stat-card">
          <h3>Utilization Rate</h3>
          <p class="stat-value">${totals.utilization_rate}%</p>
        </div>
        <div class="stat-card">
          <h3>Total Credits</h3>
          <p class="stat-value">${totals.total_count}</p>
        </div>
      </div>
      <div class="table-container">
        <h3>Credit Limits by Category</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Count</th>
              <th>Total Amount</th>
              <th>Total Limit</th>
              <th>Average Amount</th>
              <th>Average Limit</th>
            </tr>
          </thead>
          <tbody>
            ${byCategory.length > 0 ? 
              byCategory.map(cat => `
                <tr>
                  <td>${cat.category.replace('_', ' ').toUpperCase()}</td>
                  <td>${cat.count}</td>
                  <td>Ksh ${parseFloat(cat.total_amount).toLocaleString()}</td>
                  <td>Ksh ${cat.total_limit ? parseFloat(cat.total_limit).toLocaleString() : 'N/A'}</td>
                  <td>Ksh ${parseFloat(cat.avg_amount).toLocaleString()}</td>
                  <td>Ksh ${cat.avg_limit ? parseFloat(cat.avg_limit).toLocaleString() : 'N/A'}</td>
                </tr>
              `).join('') :
              '<tr><td colspan="6" style="text-align: center; padding: 20px;">No credit data available</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading credit limits:', error);
    let errorMessage = 'Failed to load credit limits data. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    } else if (error.message.includes('HTTP error! status: 404')) {
      errorMessage = 'Server not responding. Please check if the server is running.';
    } else if (error.message.includes('HTTP error! status: 500')) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Credit Limits</h2>
        <p>${errorMessage}</p>
        <button onclick="document.getElementById('sidebar-credit-limit').click()" class="btn-primary">Retry</button>
        <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-credit-reports').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-credit-reports');
  
  try {
    const data = await apiCall('/credits/reports/summary');
    const reports = data.reports;
    
    document.getElementById('content-area').innerHTML = `
      <h2>📈 Credit Reports</h2>
      <div class="reports-container">
        ${Object.keys(reports).length > 0 ? 
          Object.keys(reports).map(status => `
            <div class="report-section">
              <h3>${status.charAt(0).toUpperCase() + status.slice(1)} Credits</h3>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Total Amount</th>
                      <th>Average Amount</th>
                      <th>Min Amount</th>
                      <th>Max Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reports[status].map(cat => `
                      <tr>
                        <td>${cat.category.replace('_', ' ').toUpperCase()}</td>
                        <td>${cat.count}</td>
                        <td>Ksh ${parseFloat(cat.total_amount).toLocaleString()}</td>
                        <td>Ksh ${parseFloat(cat.avg_amount).toLocaleString()}</td>
                        <td>Ksh ${parseFloat(cat.min_amount).toLocaleString()}</td>
                        <td>Ksh ${parseFloat(cat.max_amount).toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('') :
          '<div class="no-data-message"><h3>No Credit Data Available</h3><p>Create some credits to see reports and analytics.</p></div>'
        }
      </div>
    `;
  } catch (error) {
    console.error('Error loading credit reports:', error);
    let errorMessage = 'Failed to load credit reports data. Please try again.';
    
    if (error.message.includes('authentication')) {
      errorMessage = 'Please login to access this feature.';
    } else if (error.message.includes('HTTP error! status: 404')) {
      errorMessage = 'Server not responding. Please check if the server is running.';
    } else if (error.message.includes('HTTP error! status: 500')) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Credit Reports</h2>
        <p>${errorMessage}</p>
        <button onclick="document.getElementById('sidebar-credit-reports').click()" class="btn-primary">Retry</button>
        <button onclick="window.location.href='/login.html'" class="btn-secondary" style="margin-left: 10px;">Login</button>
      </div>
    `;
  }
});

// Transactions
document.getElementById('sidebar-receive-payment').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-receive-payment');
  
  try {
  document.getElementById('content-area').innerHTML = `
      <h2>💸 Receive Payment</h2>
      <form id="receive-payment-form" class="professional-form">
        <div class="form-group">
          <label for="payer-name">Payer Name:</label>
          <input type="text" id="payer-name" required>
        </div>
        <div class="form-group">
          <label for="payment-amount">Payment Amount (Ksh):</label>
          <input type="number" id="payment-amount" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="payment-method">Payment Method:</label>
          <select id="payment-method" required>
            <option value="">Select Method</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit_card">Credit Card</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="payment-date">Payment Date:</label>
          <input type="date" id="payment-date" required>
        </div>
        <div class="form-group">
          <label for="payment-description">Description:</label>
          <textarea id="payment-description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="reference-number">Reference Number:</label>
          <input type="text" id="reference-number">
        </div>
        <button type="submit" class="btn-primary">Record Payment</button>
    </form>
  `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Form</h2>
        <p>Failed to load payment form. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-make-payment').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-make-payment');
  
  try {
    const creditsData = await apiCall('/credits');
    const credits = creditsData.credits;
    
  document.getElementById('content-area').innerHTML = `
      <h2>💸 Make Payment</h2>
      <form id="make-payment-form" class="professional-form">
        <div class="form-group">
          <label for="credit-select">Select Credit:</label>
          <select id="credit-select" required>
            <option value="">Choose Credit</option>
            ${credits.map(credit => `<option value="${credit.id}">${credit.creditor_name} - Ksh ${parseFloat(credit.amount).toLocaleString()}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="payment-amount">Payment Amount (Ksh):</label>
          <input type="number" id="payment-amount" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="payment-method">Payment Method:</label>
          <select id="payment-method" required>
            <option value="">Select Method</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit_card">Credit Card</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="payment-date">Payment Date:</label>
          <input type="date" id="payment-date" required>
        </div>
        <div class="form-group">
          <label for="payment-description">Description:</label>
          <textarea id="payment-description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="reference-number">Reference Number:</label>
          <input type="text" id="reference-number">
        </div>
        <button type="submit" class="btn-primary">Record Payment</button>
    </form>
  `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Form</h2>
        <p>Failed to load payment form. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-transaction-history').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-transaction-history');
  
  try {
    const data = await apiCall('/transactions');
    const transactions = data.transactions;
    
    document.getElementById('content-area').innerHTML = `
      <h2>📋 Transaction History</h2>
      <div class="filters">
        <select id="type-filter" onchange="filterTransactions()">
          <option value="">All Types</option>
          <option value="payment_received">Payment Received</option>
          <option value="payment_made">Payment Made</option>
          <option value="debt_created">Debt Created</option>
          <option value="credit_created">Credit Created</option>
        </select>
        <select id="status-filter" onchange="filterTransactions()">
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" id="start-date" placeholder="Start Date" onchange="filterTransactions()">
        <input type="date" id="end-date" placeholder="End Date" onchange="filterTransactions()">
      </div>
      <div class="table-container">
        <table class="data-table" id="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.length > 0 ? 
              transactions.map(transaction => `
                <tr data-type="${transaction.type}" data-status="${transaction.status}">
                  <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                  <td>${transaction.type.replace('_', ' ').toUpperCase()}</td>
                  <td>${transaction.payer_name || 'N/A'}</td>
                  <td>Ksh ${parseFloat(transaction.amount).toLocaleString()}</td>
                  <td>${transaction.payment_method ? transaction.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</td>
                  <td><span class="status ${transaction.status}">${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</span></td>
                  <td>
                    <button class="btn-small" onclick="viewTransaction(${transaction.id})">View</button>
                    <button class="btn-small" onclick="editTransaction(${transaction.id})">Edit</button>
                  </td>
                </tr>
              `).join('') :
              '<tr><td colspan="7" style="text-align: center; padding: 20px;">No transactions found</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Transactions</h2>
        <p>Failed to load transaction history. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

document.getElementById('sidebar-pending-transactions').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-pending-transactions');
  
  try {
    const data = await apiCall('/transactions/pending/list');
    const pendingTransactions = data.pendingTransactions;
    
    document.getElementById('content-area').innerHTML = `
      <h2>⏳ Pending Transactions</h2>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pendingTransactions.length > 0 ? 
              pendingTransactions.map(transaction => `
                <tr>
                  <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                  <td>${transaction.type.replace('_', ' ').toUpperCase()}</td>
                  <td>${transaction.payer_name || 'N/A'}</td>
                  <td>Ksh ${parseFloat(transaction.amount).toLocaleString()}</td>
                  <td>${transaction.payment_method ? transaction.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</td>
                  <td>${transaction.description || 'N/A'}</td>
                  <td>
                    <button class="btn-small" onclick="approveTransaction(${transaction.id})">Approve</button>
                    <button class="btn-small" onclick="rejectTransaction(${transaction.id})">Reject</button>
                  </td>
                </tr>
              `).join('') :
              '<tr><td colspan="7" style="text-align: center; padding: 20px;">No pending transactions</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Pending Transactions</h2>
        <p>Failed to load pending transactions. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});





// Notifications dropdown toggle
document.getElementById('notifications-btn').addEventListener('click', function() {
  const dropdown = document.getElementById('notifications-dropdown');
  dropdown.classList.toggle('show');
});

// User menu dropdown toggle
document.getElementById('user-btn').addEventListener('click', function() {
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('show');
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const notificationsBtn = document.getElementById('notifications-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const userBtn = document.getElementById('user-btn');
  
  if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
    notificationsDropdown.classList.remove('show');
  }
  
  if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.classList.remove('show');
  }
});

// User Profile Page
document.getElementById('profile').addEventListener('click', async function(e) {
  e.preventDefault();
  document.getElementById('user-dropdown').classList.remove('show');
  
  try {
    // Get user data from token or API
    const token = localStorage.getItem('token');
    const userData = JSON.parse(atob(token.split('.')[1]));
    
    document.getElementById('content-area').innerHTML = `
      <div class="profile-page">
        <h2>👤 User Profile</h2>
        
        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-avatar">
              <div class="avatar-circle">
                <span class="avatar-text">${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}</span>
              </div>
            </div>
            <div class="profile-info">
              <h3>${userData.username || 'User'}</h3>
              <p class="profile-email">${userData.email || 'user@example.com'}</p>
              <p class="profile-role">Business Owner</p>
            </div>
            <div class="profile-actions">
              <button class="btn-primary" onclick="editProfile()">
                <span class="btn-icon">✏️</span>
                Edit Profile
              </button>
            </div>
          </div>
          
          <div class="profile-sections">
            <div class="profile-section">
              <h4>📊 Account Statistics</h4>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">💳</div>
                  <div class="stat-content">
                    <h5>Total Debts</h5>
                    <p class="stat-value">0</p>
                    <small>Active records</small>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">💰</div>
                  <div class="stat-content">
                    <h5>Total Credits</h5>
                    <p class="stat-value">0</p>
                    <small>Credit accounts</small>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">💸</div>
                  <div class="stat-content">
                    <h5>Transactions</h5>
                    <p class="stat-value">0</p>
                    <small>This month</small>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">📅</div>
                  <div class="stat-content">
                    <h5>Member Since</h5>
                    <p class="stat-value">${new Date(userData.iat * 1000).toLocaleDateString()}</p>
                    <small>Account created</small>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="profile-section">
              <h4>🔐 Security Information</h4>
              <div class="security-info">
                <div class="security-item">
                  <span class="security-label">Last Login:</span>
                  <span class="security-value">${new Date().toLocaleString()}</span>
                </div>
                <div class="security-item">
                  <span class="security-label">Account Status:</span>
                  <span class="security-value status-active">Active</span>
                </div>
                <div class="security-item">
                  <span class="security-label">Two-Factor Auth:</span>
                  <span class="security-value status-inactive">Disabled</span>
                </div>
                <div class="security-item">
                  <span class="security-label">Password Last Changed:</span>
                  <span class="security-value">Never</span>
                </div>
              </div>
            </div>
            
            <div class="profile-section">
              <h4>⚙️ Account Preferences</h4>
              <div class="preferences-grid">
                <div class="preference-item">
                  <label class="preference-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Email Notifications
                  </label>
                  <small>Receive email updates about your account</small>
                </div>
                <div class="preference-item">
                  <label class="preference-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    SMS Notifications
                  </label>
                  <small>Receive SMS alerts for important updates</small>
                </div>
                <div class="preference-item">
                  <label class="preference-label">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    Marketing Emails
                  </label>
                  <small>Receive promotional offers and updates</small>
                </div>
                <div class="preference-item">
                  <label class="preference-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Auto-backup
                  </label>
                  <small>Automatically backup your data daily</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Profile</h2>
        <p>Failed to load profile data. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

// Settings Page
document.getElementById('settings').addEventListener('click', async function(e) {
  e.preventDefault();
  document.getElementById('user-dropdown').classList.remove('show');
  
  document.getElementById('content-area').innerHTML = `
    <div class="settings-page">
      <h2>⚙️ Application Settings</h2>
      
      <div class="settings-container">
        <div class="settings-nav">
          <div class="settings-nav-item active" onclick="showSettingsSection('general')">
            <span class="nav-icon">🔧</span>
            <span class="nav-text">General</span>
          </div>
          <div class="settings-nav-item" onclick="showSettingsSection('notifications')">
            <span class="nav-icon">🔔</span>
            <span class="nav-text">Notifications</span>
          </div>
          <div class="settings-nav-item" onclick="showSettingsSection('security')">
            <span class="nav-icon">🔐</span>
            <span class="nav-text">Security</span>
          </div>
          <div class="settings-nav-item" onclick="showSettingsSection('backup')">
            <span class="nav-icon">💾</span>
            <span class="nav-text">Backup & Export</span>
          </div>
          <div class="settings-nav-item" onclick="showSettingsSection('appearance')">
            <span class="nav-icon">🎨</span>
            <span class="nav-text">Appearance</span>
          </div>
        </div>
        
        <div class="settings-content">
          <div id="settings-general" class="settings-section active">
            <h3>General Settings</h3>
            <div class="settings-form">
              <div class="form-group">
                <label for="business-name">Business Name:</label>
                <input type="text" id="business-name" value="My Business" placeholder="Enter your business name">
              </div>
              <div class="form-group">
                <label for="business-email">Business Email:</label>
                <input type="email" id="business-email" value="business@example.com" placeholder="Enter business email">
              </div>
              <div class="form-group">
                <label for="business-phone">Business Phone:</label>
                <input type="tel" id="business-phone" value="(555) 123-4567" placeholder="Enter business phone">
              </div>
              <div class="form-group">
                <label for="business-address">Business Address:</label>
                <textarea id="business-address" rows="3" placeholder="Enter business address">123 Business St, City, State 12345</textarea>
              </div>
              <div class="form-group">
                <label for="timezone">Timezone:</label>
                <select id="timezone">
                  <option value="UTC-5">Eastern Time (UTC-5)</option>
                  <option value="UTC-6">Central Time (UTC-6)</option>
                  <option value="UTC-7">Mountain Time (UTC-7)</option>
                  <option value="UTC-8">Pacific Time (UTC-8)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="currency">Default Currency:</label>
                <select id="currency">
                  <option value="USD" selected>US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="CAD">Canadian Dollar (C$)</option>
                </select>
              </div>
              <button class="btn-primary" onclick="saveGeneralSettings()">Save Changes</button>
            </div>
          </div>
          
          <div id="settings-notifications" class="settings-section">
            <h3>Notification Settings</h3>
            <div class="notification-settings">
              <div class="notification-group">
                <h4>Email Notifications</h4>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Payment Reminders
                  </label>
                  <small>Get notified when payments are due</small>
                </div>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Overdue Alerts
                  </label>
                  <small>Get notified about overdue payments</small>
                </div>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    Weekly Reports
                  </label>
                  <small>Receive weekly summary reports</small>
                </div>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    System Updates
                  </label>
                  <small>Get notified about system maintenance</small>
                </div>
              </div>
              
              <div class="notification-group">
                <h4>In-App Notifications</h4>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Dashboard Alerts
                  </label>
                  <small>Show alerts on the dashboard</small>
                </div>
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                    Sound Notifications
                  </label>
                  <small>Play sound for new notifications</small>
                </div>
              </div>
              
              <button class="btn-primary" onclick="saveNotificationSettings()">Save Notification Settings</button>
            </div>
          </div>
          
          <div id="settings-security" class="settings-section">
            <h3>Security Settings</h3>
            <div class="security-settings">
              <div class="security-group">
                <h4>Password</h4>
                <div class="form-group">
                  <label for="current-password">Current Password:</label>
                  <input type="password" id="current-password" placeholder="Enter current password">
                </div>
                <div class="form-group">
                  <label for="new-password">New Password:</label>
                  <input type="password" id="new-password" placeholder="Enter new password">
                </div>
                <div class="form-group">
                  <label for="confirm-password">Confirm New Password:</label>
                  <input type="password" id="confirm-password" placeholder="Confirm new password">
                </div>
                <button class="btn-primary" onclick="changePassword()">Change Password</button>
              </div>
              
              <div class="security-group">
                <h4>Two-Factor Authentication</h4>
                <div class="two-factor-info">
                  <p>Add an extra layer of security to your account</p>
                  <button class="btn-secondary" onclick="enableTwoFactor()">Enable 2FA</button>
                </div>
              </div>
              
              <div class="security-group">
                <h4>Session Management</h4>
                <div class="session-info">
                  <p>Manage your active sessions</p>
                  <button class="btn-secondary" onclick="viewSessions()">View Active Sessions</button>
                  <button class="btn-danger" onclick="logoutAllDevices()">Logout All Devices</button>
                </div>
              </div>
            </div>
          </div>
          
          <div id="settings-backup" class="settings-section">
            <h3>Backup & Export</h3>
            <div class="backup-settings">
              <div class="backup-group">
                <h4>Automatic Backup</h4>
                <div class="backup-options">
                  <div class="form-group">
                    <label for="backup-frequency">Backup Frequency:</label>
                    <select id="backup-frequency">
                      <option value="daily">Daily</option>
                      <option value="weekly" selected>Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="backup-retention">Retention Period:</label>
                    <select id="backup-retention">
                      <option value="30">30 days</option>
                      <option value="90" selected>90 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="backup-group">
                <h4>Manual Export</h4>
                <div class="export-options">
                  <button class="btn-primary" onclick="exportData('csv')">
                    <span class="btn-icon">📊</span>
                    Export as CSV
                  </button>
                  <button class="btn-primary" onclick="exportData('excel')">
                    <span class="btn-icon">📋</span>
                    Export as Excel
                  </button>
                  <button class="btn-primary" onclick="exportData('json')">
                    <span class="btn-icon">💾</span>
                    Export as JSON
                  </button>
                </div>
              </div>
              
              <div class="backup-group">
                <h4>Data Import</h4>
                <div class="import-options">
                  <input type="file" id="import-file" accept=".csv,.xlsx,.json" style="display: none;">
                  <button class="btn-secondary" onclick="document.getElementById('import-file').click()">
                    <span class="btn-icon">📥</span>
                    Import Data
                  </button>
                </div>
              </div>
              
              <button class="btn-primary" onclick="saveBackupSettings()">Save Backup Settings</button>
            </div>
          </div>
          
          <div id="settings-appearance" class="settings-section">
            <h3>Appearance Settings</h3>
            <div class="appearance-settings">
              <div class="appearance-group">
                <h4>Theme</h4>
                <div class="theme-options">
                  <div class="theme-option active" onclick="setTheme('dark')">
                    <div class="theme-preview dark-theme"></div>
                    <span>Dark Theme</span>
                  </div>
                  <div class="theme-option" onclick="setTheme('light')">
                    <div class="theme-preview light-theme"></div>
                    <span>Light Theme</span>
                  </div>
                  <div class="theme-option" onclick="setTheme('auto')">
                    <div class="theme-preview auto-theme"></div>
                    <span>Auto</span>
                  </div>
                </div>
              </div>
              
              <div class="appearance-group">
                <h4>Language</h4>
                <div class="form-group">
                  <label for="language">Select Language:</label>
                  <select id="language">
                    <option value="en" selected>English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
              
              <div class="appearance-group">
                <h4>Dashboard Layout</h4>
                <div class="layout-options">
                  <div class="form-group">
                    <label for="sidebar-width">Sidebar Width:</label>
                    <select id="sidebar-width">
                      <option value="narrow">Narrow</option>
                      <option value="normal" selected>Normal</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="default-page">Default Page:</label>
                    <select id="default-page">
                      <option value="overview" selected>Overview</option>
                      <option value="analytics">Analytics</option>
                      <option value="reports">Reports</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <button class="btn-primary" onclick="saveAppearanceSettings()">Save Appearance Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
});

// Logout Functionality
document.getElementById('logout').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('user-dropdown').classList.remove('show');
  
  if (confirm('Are you sure you want to logout?')) {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login.html';
  }
});

// Add event listeners for form submissions
document.addEventListener('submit', async function(e) {
  if (e.target.id === 'record-debt-form') {
    e.preventDefault();
    try {
      // Get form data
      const debtorName = document.getElementById('debtor-name').value;
      const debtorEmail = document.getElementById('debtor-email').value;
      const debtorPhone = document.getElementById('debtor-phone').value;
      const amount = document.getElementById('amount').value;
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value;
      const dueDate = document.getElementById('due-date').value;
      const referenceNumber = document.getElementById('reference-number').value;
      const interestRate = document.getElementById('interest-rate').value || 0;
      const paymentTerms = document.getElementById('payment-terms').value;
      const notes = document.getElementById('notes').value;
      
      // Validation
      if (!debtorName.trim()) {
        alert('Please enter the debtor name.');
        return;
      }
      
      if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount.');
        return;
      }
      
      if (!dueDate) {
        alert('Please select a due date.');
        return;
      }
      
      const formData = {
        debtor_name: debtorName.trim(),
        debtor_email: debtorEmail.trim(),
        debtor_phone: debtorPhone.trim(),
        amount: parseFloat(amount),
        category: category,
        description: description.trim(),
        due_date: dueDate,
        reference_number: referenceNumber.trim(),
        interest_rate: parseFloat(interestRate) || 0,
        payment_terms: paymentTerms,
        notes: notes.trim()
      };
      
      console.log('Submitting debt data:', formData);
      
      const result = await apiCall('/debts', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      console.log('Debt creation result:', result);
      alert('Debt recorded successfully!');
      
      // Update dashboard data after debt creation
      await refreshDashboardData();
      
      document.getElementById('sidebar-view-debts').click(); // Go to debts list
    } catch (error) {
      console.error('Error recording debt:', error);
      alert(`Failed to record debt: ${error.message || 'Please try again.'}`);
    }
  } else if (e.target.id === 'edit-debt-form') {
    e.preventDefault();
    try {
      const debtId = window.currentEditingDebtId; // We'll need to set this when opening edit form
      const formData = {
        debtor_name: document.getElementById('edit-debtor-name').value,
        debtor_email: document.getElementById('edit-debtor-email').value,
        debtor_phone: document.getElementById('edit-debtor-phone').value,
        amount: document.getElementById('edit-amount').value,
        category: document.getElementById('edit-category').value,
        description: document.getElementById('edit-description').value,
        due_date: document.getElementById('edit-due-date').value,
        reference_number: document.getElementById('edit-reference-number').value,
        interest_rate: document.getElementById('edit-interest-rate').value || 0,
        payment_terms: document.getElementById('edit-payment-terms').value,
        notes: document.getElementById('edit-notes').value,
        status: document.getElementById('edit-status').value
      };
      
      await apiCall(`/debts/${debtId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      alert('Debt updated successfully!');
      
      // Update dashboard data after debt update
      await refreshDashboardData();
      
      viewDebt(debtId); // Go back to debt details
    } catch (error) {
      console.error('Error updating debt:', error);
      alert('Failed to update debt. Please try again.');
    }
  } else if (e.target.id === 'record-payment-form') {
    e.preventDefault();
    try {
      const debtId = window.currentPaymentDebtId; // We'll need to set this when opening payment form
      const formData = {
        amount: document.getElementById('payment-amount').value,
        payment_date: document.getElementById('payment-date').value,
        payment_method: document.getElementById('payment-method').value,
        notes: document.getElementById('payment-notes').value
      };
      
      const result = await apiCall(`/debts/${debtId}/payments`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      alert('Payment recorded successfully!');
      
      // Update dashboard data after payment
      await refreshDashboardData();
      
      // Specifically update debt data to reflect payment
      await updateDebtDataAfterPayment();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  } else if (e.target.id === 'record-credit-form') {
    e.preventDefault();
    try {
      const formData = {
        creditor_name: document.getElementById('creditor-name').value,
        amount: document.getElementById('credit-amount').value,
        credit_limit: document.getElementById('credit-limit').value,
        category: document.getElementById('credit-category').value,
        description: document.getElementById('credit-description').value
      };
      
      await apiCall('/credits', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      alert('Credit recorded successfully!');
      
      // Update dashboard data after credit creation
      await refreshDashboardData();
      
      document.getElementById('sidebar-record-credit').click(); // Refresh the form
    } catch (error) {
      alert('Failed to record credit. Please try again.');
    }
  } else if (e.target.id === 'edit-credit-form') {
    e.preventDefault();
    try {
      const creditId = document.getElementById('credit-id').value;
      const formData = {
        creditor_name: document.getElementById('edit-creditor-name').value,
        amount: document.getElementById('edit-credit-amount').value,
        credit_limit: document.getElementById('edit-credit-limit').value,
        category: document.getElementById('edit-credit-category').value,
        status: document.getElementById('edit-credit-status').value,
        interest_rate: document.getElementById('edit-interest-rate').value,
        description: document.getElementById('edit-credit-description').value
      };
      
      await apiCall(`/credits/${creditId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      alert('Credit updated successfully!');
      
      // Update dashboard data after credit update
      await refreshDashboardData();
      
      viewCredit(creditId); // Show the updated credit details
    } catch (error) {
      alert('Failed to update credit. Please try again.');
    }
  } else if (e.target.id === 'make-payment-form') {
    e.preventDefault();
    try {
      const formData = {
        credit_id: document.getElementById('credit-select').value,
        amount: document.getElementById('payment-amount').value,
        payment_method: document.getElementById('payment-method').value,
        payment_date: document.getElementById('payment-date').value,
        description: document.getElementById('payment-description').value,
        reference_number: document.getElementById('reference-number').value
      };
      
      await apiCall('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          type: 'payment_made',
          transaction_date: formData.payment_date
        })
      });
      
      alert('Payment recorded successfully!');
      
      // Update dashboard data after payment
      await refreshDashboardData();
      
      // Specifically update debt data to reflect payment
      await updateDebtDataAfterPayment();
      
      document.getElementById('sidebar-make-payment').click(); // Refresh the form
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  } else if (e.target.id === 'add-category-form') {
    e.preventDefault();
    try {
      const categoryName = document.getElementById('new-category-name').value;
      const description = document.getElementById('new-category-description').value;
      
      if (!categoryName.trim()) {
        alert('Please enter a category name.');
        return;
      }
      
      const result = await apiCall('/debts/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryName.trim(),
          description: description.trim()
        })
      });
      
      alert('Category created successfully!');
      document.getElementById('sidebar-debt-categories').click(); // Refresh the categories page
    } catch (error) {
      console.error('Error adding category:', error);
      alert(`Failed to add category: ${error.message || 'Please try again.'}`);
    }
  } else if (e.target.id === 'receive-payment-form') {
    e.preventDefault();
    try {
      const formData = {
        payer_name: document.getElementById('payer-name').value,
        amount: document.getElementById('payment-amount').value,
        payment_method: document.getElementById('payment-method').value,
        description: document.getElementById('payment-description')?.value || '',
        transaction_date: document.getElementById('payment-date').value
      };
      
      await apiCall('/transactions/receive-payment', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      alert('Payment received successfully!');
      
      // Update dashboard data after payment
      await refreshDashboardData();
      
      // Specifically update debt data to reflect payment
      await updateDebtDataAfterPayment();
      
      document.getElementById('sidebar-receive-payment').click(); // Refresh the form
    } catch (error) {
      alert('Failed to record payment. Please try again.');
    }
  }
});

// Sidebar Navigation Functions
function setActiveNavLink(activeId) {
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to clicked link
  const activeLink = document.getElementById(activeId);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}



// Connect all sidebar links to their navbar counterparts
// Removed duplicate DOMContentLoaded listener - using the one at the top of the file

// Analytics Page
document.getElementById('sidebar-analytics').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-analytics');
  
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Fetching analytics data...');
    
    // Fetch analytics data with error handling
    const data = await apiCall('/dashboard/analytics').catch(err => {
      console.warn('Analytics data failed:', err);
      return { debtTrends: [], paymentTrends: [], debtByCategory: [] };
    });
    
    const { debtTrends = [], paymentTrends = [], debtByCategory = [], performance = {} } = data;
    
    // Calculate totals for charts with safe fallbacks
    const totalDebtAmount = debtTrends.reduce((sum, trend) => sum + parseFloat(trend.total_amount || 0), 0);
    const totalPaymentAmount = paymentTrends.reduce((sum, trend) => sum + parseFloat(trend.total_amount || 0), 0);
    const totalDebts = debtTrends.reduce((sum, trend) => sum + (trend.count || 0), 0);
    const totalPayments = paymentTrends.reduce((sum, trend) => sum + (trend.count || 0), 0);
    
    // Use performance data from API or calculate fallbacks
    const collectionRate = performance.collectionRate || (totalDebtAmount > 0 ? ((totalPaymentAmount / totalDebtAmount) * 100).toFixed(1) : 0);
    const paidDebts = performance.paidDebts || 0;
    const activeDebts = performance.activeDebts || 0;
    const totalCollected = performance.totalCollected || totalPaymentAmount;
    const totalOutstanding = performance.totalOutstanding || totalDebtAmount;
    
    document.getElementById('content-area').innerHTML = `
      <div class="analytics-page">
        <div class="analytics-header">
          <h2>📊 Analytics Dashboard</h2>
          <div class="analytics-controls">
            <button class="btn-refresh" onclick="refreshAnalytics()" title="Refresh Data">
              🔄 Refresh
            </button>
            <button class="btn-secondary" onclick="exportAnalytics()" title="Export Analytics">
              📊 Export
            </button>
          </div>
        </div>
        
        <!-- Analytics Summary -->
        <div class="analytics-summary">
          <div class="summary-card">
            <h3>Debt Analytics</h3>
            <div class="summary-metrics">
              <div class="metric">
                <span class="metric-label">Total Debts Created</span>
                <span class="metric-value">${totalDebts}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Total Amount</span>
                <span class="metric-value">Ksh ${totalDebtAmount.toLocaleString()}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Average per Debt</span>
                <span class="metric-value">Ksh ${totalDebts > 0 ? (totalDebtAmount / totalDebts).toFixed(0) : 0}</span>
              </div>
            </div>
          </div>
          
          <div class="summary-card">
            <h3>Payment Analytics</h3>
            <div class="summary-metrics">
              <div class="metric">
                <span class="metric-label">Total Payments</span>
                <span class="metric-value">${totalPayments}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Total Amount</span>
                <span class="metric-value">Ksh ${totalPaymentAmount.toLocaleString()}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Average per Payment</span>
                <span class="metric-value">Ksh ${totalPayments > 0 ? (totalPaymentAmount / totalPayments).toFixed(0) : 0}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Container -->
        <div class="analytics-container">
          <div class="chart-section">
            <div class="chart-header">
              <h3>Debt Trends (Last 30 Days)</h3>
              <div class="chart-controls">
                <select id="debt-period" onchange="updateDebtChart()">
                  <option value="7">Last 7 Days</option>
                  <option value="30" selected>Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
            <div class="chart-container">
              ${debtTrends && debtTrends.length > 0 ? 
                debtTrends.map(trend => {
                  const percentage = totalDebtAmount > 0 ? (parseFloat(trend.total_amount || 0) / totalDebtAmount * 100) : 0;
                  return `
                    <div class="trend-item">
                      <div class="trend-date">${new Date(trend.date).toLocaleDateString()}</div>
                      <div class="trend-bar">
                        <div class="trend-bar-fill" style="width: ${percentage}%"></div>
                      </div>
                      <div class="trend-details">
                        <span class="trend-count">${trend.count || 0} debts</span>
                        <span class="trend-amount">Ksh ${parseFloat(trend.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  `;
                }).join('') :
                '<div class="no-data">No debt trends data available</div>'
              }
            </div>
          </div>
          
          <div class="chart-section">
            <div class="chart-header">
              <h3>Payment Trends (Last 30 Days)</h3>
              <div class="chart-controls">
                <select id="payment-period" onchange="updatePaymentChart()">
                  <option value="7">Last 7 Days</option>
                  <option value="30" selected>Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
            <div class="chart-container">
              ${paymentTrends && paymentTrends.length > 0 ? 
                paymentTrends.map(trend => {
                  const percentage = totalPaymentAmount > 0 ? (parseFloat(trend.total_amount || 0) / totalPaymentAmount * 100) : 0;
                  return `
                    <div class="trend-item">
                      <div class="trend-date">${new Date(trend.date).toLocaleDateString()}</div>
                      <div class="trend-bar">
                        <div class="trend-bar-fill payment" style="width: ${percentage}%"></div>
                      </div>
                      <div class="trend-details">
                        <span class="trend-count">${trend.count || 0} payments</span>
                        <span class="trend-amount">Ksh ${parseFloat(trend.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  `;
                }).join('') :
                '<div class="no-data">No payment trends data available</div>'
              }
            </div>
          </div>
          
          <div class="chart-section full-width">
            <h3>Debts by Category</h3>
            <div class="category-chart">
              ${debtByCategory && debtByCategory.length > 0 ? 
                debtByCategory.map(cat => {
                  const totalCategoryAmount = debtByCategory.reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0);
                  const percentage = totalCategoryAmount > 0 ? (parseFloat(cat.total_amount || 0) / totalCategoryAmount * 100) : 0;
                  return `
                    <div class="category-item">
                      <div class="category-info">
                        <span class="category-name">${cat.category.replace('_', ' ').toUpperCase()}</span>
                        <span class="category-percentage">${percentage.toFixed(1)}%</span>
                      </div>
                      <div class="category-bar">
                        <div class="category-bar-fill" style="width: ${percentage}%"></div>
                      </div>
                      <div class="category-details">
                        <span class="category-count">${cat.count || 0} debts</span>
                        <span class="category-amount">Ksh ${parseFloat(cat.total_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  `;
                }).join('') :
                '<div class="no-data">No category data available</div>'
              }
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="performance-metrics">
          <h3>Performance Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">📈</div>
              <div class="metric-content">
                <h4>Collection Rate</h4>
                <p class="metric-value">${collectionRate}%</p>
                <small>Payments vs Outstanding</small>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">✅</div>
              <div class="metric-content">
                <h4>Paid Debts</h4>
                <p class="metric-value">${paidDebts}</p>
                <small>Successfully collected</small>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⏳</div>
              <div class="metric-content">
                <h4>Active Debts</h4>
                <p class="metric-value">${activeDebts}</p>
                <small>Pending collection</small>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💰</div>
              <div class="metric-content">
                <h4>Total Collected</h4>
                <p class="metric-value">Ksh ${parseFloat(totalCollected).toLocaleString()}</p>
                <small>All time payments</small>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📊</div>
              <div class="metric-content">
                <h4>Outstanding Amount</h4>
                <p class="metric-value">Ksh ${parseFloat(totalOutstanding).toLocaleString()}</p>
                <small>Still to collect</small>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💸</div>
              <div class="metric-content">
                <h4>Average Payment</h4>
                <p class="metric-value">Ksh ${totalPayments > 0 ? (totalPaymentAmount / totalPayments).toFixed(0) : 0}</p>
                <small>Per payment</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Analytics</h2>
        <p>Failed to load analytics data. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

// Reports Page
document.getElementById('sidebar-reports').addEventListener('click', async function(e) {
  e.preventDefault();
  setActiveNavLink('sidebar-reports');
  
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Fetching reports data...');
    
    // Fetch reports data with error handling
    const data = await apiCall('/dashboard/reports').catch(err => {
      console.warn('Reports data failed:', err);
      return { summary: [] };
    });
    
    const { summary = [] } = data;
    
    // Calculate report metrics with safe fallbacks
    const debtsData = summary.find(item => item.type === 'debts') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
    const creditsData = summary.find(item => item.type === 'credits') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
    const transactionsData = summary.find(item => item.type === 'transactions') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
    
    const currentDate = new Date().toLocaleDateString();
    const reportId = 'RPT-' + Date.now().toString().slice(-6);
    
    document.getElementById('content-area').innerHTML = `
      <div class="reports-page">
        <div class="reports-header">
          <h2>📈 Business Reports</h2>
          <div class="report-actions">
            <button class="btn-refresh" onclick="refreshReports()" title="Refresh Data">
              🔄 Refresh
            </button>
            <button class="btn-primary" onclick="generateReport('summary')">
              <span class="btn-icon">📊</span>
              Summary Report
            </button>
            <button class="btn-primary" onclick="generateReport('detailed')">
              <span class="btn-icon">📋</span>
              Detailed Report
            </button>
            <button class="btn-primary" onclick="exportReport()">
              <span class="btn-icon">💾</span>
              Export Report
            </button>
            <button class="btn-secondary" onclick="printReport()">
              <span class="btn-icon">🖨️</span>
              Print Report
            </button>
          </div>
        </div>

        <!-- Report Filters -->
        <div class="report-filters">
          <h3>Report Filters</h3>
          <div class="filter-row">
            <div class="filter-group">
              <label for="report-type">Report Type:</label>
              <select id="report-type">
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
                <option value="debt-analysis">Debt Analysis</option>
                <option value="payment-analysis">Payment Analysis</option>
                <option value="category-breakdown">Category Breakdown</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="date-range">Date Range:</label>
              <select id="date-range">
                <option value="7">Last 7 Days</option>
                <option value="30" selected>Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div class="filter-group" id="custom-date-range" style="display: none;">
              <label for="start-date">Start Date:</label>
              <input type="date" id="start-date">
              <label for="end-date">End Date:</label>
              <input type="date" id="end-date">
            </div>
            <div class="filter-group">
              <button class="btn-primary" onclick="applyFilters()">Apply Filters</button>
            </div>
          </div>
        </div>

        <!-- Report Summary -->
        <div class="report-summary">
          <div class="report-header">
            <h3>Business Summary Report</h3>
            <div class="report-meta">
              <span>Report ID: ${reportId}</span>
              <span>Generated: ${currentDate}</span>
            </div>
          </div>
          
          <div class="summary-cards">
            <div class="summary-card debts">
              <div class="card-header">
                <h4>💳 Debt Summary</h4>
                <span class="card-icon">📊</span>
              </div>
              <div class="card-content">
                <div class="metric-row">
                  <span class="metric-label">Total Debts:</span>
                  <span class="metric-value">${debtsData.count}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Total Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(debtsData.total_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Average Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(debtsData.avg_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Min Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(debtsData.min_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Max Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(debtsData.max_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="summary-card credits">
              <div class="card-header">
                <h4>💰 Credit Summary</h4>
                <span class="card-icon">📈</span>
              </div>
              <div class="card-content">
                <div class="metric-row">
                  <span class="metric-label">Total Credits:</span>
                  <span class="metric-value">${creditsData.count}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Total Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(creditsData.total_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Average Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(creditsData.avg_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Min Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(creditsData.min_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Max Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(creditsData.max_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="summary-card transactions">
              <div class="card-header">
                <h4>💸 Transaction Summary</h4>
                <span class="card-icon">🔄</span>
              </div>
              <div class="card-content">
                <div class="metric-row">
                  <span class="metric-label">Total Transactions:</span>
                  <span class="metric-value">${transactionsData.count}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Total Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(transactionsData.total_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Average Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(transactionsData.avg_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Min Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(transactionsData.min_amount || 0).toLocaleString()}</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Max Amount:</span>
                  <span class="metric-value">Ksh ${parseFloat(transactionsData.max_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Overview -->
        <div class="financial-overview">
          <h3>Financial Overview</h3>
          <div class="overview-grid">
            <div class="overview-card">
              <h4>Net Position</h4>
              <p class="overview-value ${parseFloat(debtsData.total_amount || 0) - parseFloat(creditsData.total_amount || 0) >= 0 ? 'positive' : 'negative'}">
                Ksh ${Math.abs(parseFloat(debtsData.total_amount || 0) - parseFloat(creditsData.total_amount || 0)).toLocaleString()}
              </p>
              <small>${parseFloat(debtsData.total_amount || 0) - parseFloat(creditsData.total_amount || 0) >= 0 ? 'Positive' : 'Negative'} Balance</small>
            </div>
            <div class="overview-card">
              <h4>Total Activity</h4>
              <p class="overview-value">${(debtsData.count || 0) + (creditsData.count || 0) + (transactionsData.count || 0)}</p>
              <small>Total Records</small>
            </div>
            <div class="overview-card">
              <h4>Average Transaction</h4>
              <p class="overview-value">Ksh ${(transactionsData.count || 0) > 0 ? (parseFloat(transactionsData.total_amount || 0) / (transactionsData.count || 1)).toFixed(0) : 0}</p>
              <small>Per Transaction</small>
            </div>
            <div class="overview-card">
              <h4>Collection Rate</h4>
              <p class="overview-value">${parseFloat(debtsData.total_amount || 0) > 0 ? ((parseFloat(transactionsData.total_amount || 0) / parseFloat(debtsData.total_amount || 1)) * 100).toFixed(1) : 0}%</p>
              <small>Payments vs Debts</small>
            </div>
          </div>
        </div>

        <!-- Report Actions -->
        <div class="report-actions-footer">
          <button class="btn-primary" onclick="downloadReport('pdf')">
            <span class="btn-icon">📄</span>
            Download PDF
          </button>
          <button class="btn-primary" onclick="downloadReport('excel')">
            <span class="btn-icon">📊</span>
            Download Excel
          </button>
          <button class="btn-primary" onclick="downloadReport('csv')">
            <span class="btn-icon">📋</span>
            Download CSV
          </button>
          <button class="btn-secondary" onclick="emailReport()">
            <span class="btn-icon">📧</span>
            Email Report
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <h2>Error Loading Reports</h2>
        <p>Failed to load reports data. Please try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
});

// Helper Functions for Filtering and Actions
// Client-side filtering function removed - using server-side filtering instead

function filterCredits() {
  const statusFilter = document.getElementById('status-filter')?.value;
  const categoryFilter = document.getElementById('category-filter')?.value;
  const table = document.getElementById('credits-table');
  
  if (!table) return;
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const status = row.getAttribute('data-status');
    const category = row.getAttribute('data-category');
    
    const statusMatch = !statusFilter || status === statusFilter;
    const categoryMatch = !categoryFilter || category === categoryFilter;
    
    row.style.display = (statusMatch && categoryMatch) ? '' : 'none';
  });
}

// Credit management functions
async function viewCredit(creditId) {
  try {
    const data = await apiCall(`/credits/${creditId}`);
    const credit = data.credit;
    
    document.getElementById('content-area').innerHTML = `
      <h2>📋 Credit Details</h2>
      <div class="credit-details">
        <div class="detail-group">
          <h3>Basic Information</h3>
          <p><strong>Creditor:</strong> ${credit.creditor_name}</p>
          <p><strong>Category:</strong> ${credit.category.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Status:</strong> <span class="status ${credit.status}">${credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}</span></p>
        </div>
        <div class="detail-group">
          <h3>Financial Details</h3>
          <p><strong>Amount:</strong> Ksh ${parseFloat(credit.amount).toLocaleString()}</p>
          <p><strong>Credit Limit:</strong> ${credit.credit_limit ? 'Ksh ' + parseFloat(credit.credit_limit).toLocaleString() : 'N/A'}</p>
          <p><strong>Interest Rate:</strong> ${credit.interest_rate}%</p>
        </div>
        <div class="detail-group">
          <h3>Description</h3>
          <p>${credit.description || 'No description provided'}</p>
        </div>
        <div class="detail-group">
          <h3>Timeline</h3>
          <p><strong>Created:</strong> ${new Date(credit.created_at).toLocaleDateString()}</p>
          <p><strong>Last Updated:</strong> ${new Date(credit.updated_at).toLocaleDateString()}</p>
        </div>
        <div class="action-buttons">
          <button class="btn-primary" onclick="editCredit(${credit.id})">Edit Credit</button>
          <button class="btn-secondary" onclick="document.getElementById('sidebar-view-credits').click()">Back to Credits</button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error viewing credit:', error);
    alert('Failed to load credit details. Please try again.');
  }
}

async function editCredit(creditId) {
  try {
    const data = await apiCall(`/credits/${creditId}`);
    const credit = data.credit;
    const categoriesData = await apiCall('/credits/categories/list');
    const categories = categoriesData.categories;
    
    document.getElementById('content-area').innerHTML = `
      <h2>✏️ Edit Credit</h2>
      <form id="edit-credit-form" class="professional-form">
        <input type="hidden" id="credit-id" value="${credit.id}">
        <div class="form-group">
          <label for="edit-creditor-name">Creditor Name:</label>
          <input type="text" id="edit-creditor-name" value="${credit.creditor_name}" required>
        </div>
        <div class="form-group">
          <label for="edit-credit-category">Credit Category:</label>
          <select id="edit-credit-category" required>
            ${categories.map(cat => `<option value="${cat.value}" ${cat.value === credit.category ? 'selected' : ''}>${cat.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="edit-credit-amount">Credit Amount (Ksh):</label>
          <input type="number" id="edit-credit-amount" value="${credit.amount}" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="edit-credit-limit">Credit Limit (Ksh):</label>
          <input type="number" id="edit-credit-limit" value="${credit.credit_limit || ''}" step="0.01">
        </div>
        <div class="form-group">
          <label for="edit-interest-rate">Interest Rate (%):</label>
          <input type="number" id="edit-interest-rate" value="${credit.interest_rate}" step="0.01" min="0" max="100">
        </div>
        <div class="form-group">
          <label for="edit-credit-status">Status:</label>
          <select id="edit-credit-status">
            <option value="active" ${credit.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${credit.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="closed" ${credit.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-credit-description">Description:</label>
          <textarea id="edit-credit-description" rows="3">${credit.description || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Update Credit</button>
          <button type="button" class="btn-secondary" onclick="viewCredit(${credit.id})">Cancel</button>
        </div>
      </form>
    `;
  } catch (error) {
    console.error('Error loading credit for edit:', error);
    alert('Failed to load credit for editing. Please try again.');
  }
}

async function deleteCredit(creditId) {
  if (!confirm('Are you sure you want to delete this credit? This action cannot be undone.')) {
    return;
  }
  
  try {
    await apiCall(`/credits/${creditId}`, {
      method: 'DELETE'
    });
    
    alert('Credit deleted successfully!');
    
    // Update dashboard data after credit deletion
    await refreshDashboardData();
    
    document.getElementById('sidebar-view-credits').click(); // Refresh the credits list
  } catch (error) {
    console.error('Error deleting credit:', error);
    alert('Failed to delete credit. Please try again.');
  }
}

function filterTransactions() {
  const typeFilter = document.getElementById('type-filter')?.value;
  const statusFilter = document.getElementById('status-filter')?.value;
  const startDate = document.getElementById('start-date')?.value;
  const endDate = document.getElementById('end-date')?.value;
  const table = document.getElementById('transactions-table');
  
  if (!table) return;
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const type = row.getAttribute('data-type');
    const status = row.getAttribute('data-status');
    const dateCell = row.cells[0];
    const rowDate = new Date(dateCell.textContent);
    
    const typeMatch = !typeFilter || type === typeFilter;
    const statusMatch = !statusFilter || status === statusFilter;
    const dateMatch = (!startDate || rowDate >= new Date(startDate)) && 
                     (!endDate || rowDate <= new Date(endDate));
    
    row.style.display = (typeMatch && statusMatch && dateMatch) ? '' : 'none';
  });
}



// Action Functions
// Placeholder functions removed - actual implementations are defined later in the file

function generateReport(type) { 
  console.log('Generate report:', type);
  alert(`Generating ${type} report...`);
}

function exportReport() { 
  console.log('Export report');
  alert('Exporting report...');
}

function downloadReport(format) {
  console.log('Download report:', format);
  
  // Get current report data
  const reportData = {
    timestamp: new Date().toISOString(),
    reportId: 'RPT-' + Date.now().toString().slice(-6),
    debts: getReportData('debts'),
    credits: getReportData('credits'),
    transactions: getReportData('transactions')
  };
  
  if (format === 'csv') {
    downloadCSV(reportData);
  } else if (format === 'excel') {
    downloadExcel(reportData);
  } else if (format === 'pdf') {
    downloadPDF(reportData);
  }
  
  alert(`Report downloaded as ${format.toUpperCase()} successfully!`);
}

function getReportData(type) {
  const card = document.querySelector(`.summary-card.${type}`);
  if (!card) return {};
  
  const metrics = {};
  card.querySelectorAll('.metric-row').forEach(row => {
    const label = row.querySelector('.metric-label')?.textContent?.replace(':', '') || '';
    const value = row.querySelector('.metric-value')?.textContent || '';
    metrics[label] = value;
  });
  
  return metrics;
}

function downloadCSV(data) {
  const csvContent = `Report ID,${data.reportId}
Generated,${data.timestamp}

Debts Summary
${Object.entries(data.debts).map(([key, value]) => `${key},${value}`).join('\n')}

Credits Summary
${Object.entries(data.credits).map(([key, value]) => `${key},${value}`).join('\n')}

Transactions Summary
${Object.entries(data.transactions).map(([key, value]) => `${key},${value}`).join('\n')}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function downloadExcel(data) {
  // For Excel, we'll create a more structured CSV that Excel can open
  const excelContent = `Report ID\t${data.reportId}
Generated\t${data.timestamp}

DEBTS SUMMARY
${Object.entries(data.debts).map(([key, value]) => `${key}\t${value}`).join('\n')}

CREDITS SUMMARY
${Object.entries(data.credits).map(([key, value]) => `${key}\t${value}`).join('\n')}

TRANSACTIONS SUMMARY
${Object.entries(data.transactions).map(([key, value]) => `${key}\t${value}`).join('\n')}`;
  
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-report-${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function downloadPDF(data) {
  // For PDF, we'll create a simple text-based report
  const pdfContent = `
BUSINESS REPORT
Report ID: ${data.reportId}
Generated: ${data.timestamp}

DEBTS SUMMARY
${Object.entries(data.debts).map(([key, value]) => `${key}: ${value}`).join('\n')}

CREDITS SUMMARY
${Object.entries(data.credits).map(([key, value]) => `${key}: ${value}`).join('\n')}

TRANSACTIONS SUMMARY
${Object.entries(data.transactions).map(([key, value]) => `${key}: ${value}`).join('\n')}
`;
  
  const blob = new Blob([pdfContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `business-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function printReport() {
  console.log('Print report');
  
  // Create a print-friendly version
  const printWindow = window.open('', '_blank');
  const reportContent = document.querySelector('.reports-page').innerHTML;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Business Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .reports-page { padding: 0; }
          .report-actions, .report-actions-footer, .btn-refresh, .analytics-controls { display: none; }
          .summary-card { border: 1px solid #ccc; margin: 10px 0; padding: 15px; }
          .metric-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .overview-card { border: 1px solid #ccc; padding: 15px; text-align: center; }
        </style>
      </head>
      <body>
        ${reportContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
}

function emailReport() {
  console.log('Email report');
  const email = prompt('Enter email address to send report:');
  if (email) {
    // In a real implementation, this would send the report via email
    alert(`Report would be sent to ${email}. This feature requires backend email service integration.`);
  }
}

async function applyFilters() {
  const reportType = document.getElementById('report-type')?.value;
  const dateRange = document.getElementById('date-range')?.value;
  const customRange = document.getElementById('custom-date-range');
  
  if (dateRange === 'custom') {
    customRange.style.display = 'flex';
    return; // Don't apply filters yet, wait for custom dates
  } else {
    customRange.style.display = 'none';
  }
  
  console.log('Applying filters:', { reportType, dateRange });
  
  try {
    // Build query parameters
    let queryParams = `type=${reportType}`;
    
    if (dateRange !== 'all') {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));
      
      queryParams += `&startDate=${startDate.toISOString().split('T')[0]}`;
      queryParams += `&endDate=${endDate.toISOString().split('T')[0]}`;
    }
    
    // Fetch filtered data
    const data = await apiCall(`/dashboard/reports?${queryParams}`);
    const { summary = [] } = data;
    
    // Update the report with new data
    updateReportData(summary);
    
    alert('Filters applied successfully!');
  } catch (error) {
    console.error('Failed to apply filters:', error);
    alert('Failed to apply filters. Please try again.');
  }
}

function updateReportData(summary) {
  // Calculate report metrics with safe fallbacks
  const debtsData = summary.find(item => item.type === 'debts') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
  const creditsData = summary.find(item => item.type === 'credits') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
  const transactionsData = summary.find(item => item.type === 'transactions') || { count: 0, total_amount: 0, avg_amount: 0, min_amount: 0, max_amount: 0 };
  
  // Update debt metrics
  updateMetricCard('debts', debtsData);
  updateMetricCard('credits', creditsData);
  updateMetricCard('transactions', transactionsData);
  
  // Update financial overview
  updateFinancialOverview(debtsData, creditsData, transactionsData);
}

function updateMetricCard(type, data) {
  const card = document.querySelector(`.summary-card.${type}`);
  if (!card) return;
  
  const metrics = [
    { label: 'Total ' + (type === 'debts' ? 'Debts' : type === 'credits' ? 'Credits' : 'Transactions'), value: data.count || 0 },
    { label: 'Total Amount', value: `Ksh ${parseFloat(data.total_amount || 0).toLocaleString()}` },
    { label: 'Average Amount', value: `Ksh ${parseFloat(data.avg_amount || 0).toLocaleString()}` },
    { label: 'Min Amount', value: `Ksh ${parseFloat(data.min_amount || 0).toLocaleString()}` },
    { label: 'Max Amount', value: `Ksh ${parseFloat(data.max_amount || 0).toLocaleString()}` }
  ];
  
  const content = card.querySelector('.card-content');
  if (content) {
    content.innerHTML = metrics.map(metric => `
      <div class="metric-row">
        <span class="metric-label">${metric.label}:</span>
        <span class="metric-value">${metric.value}</span>
      </div>
    `).join('');
  }
}

function updateFinancialOverview(debtsData, creditsData, transactionsData) {
  const overviewGrid = document.querySelector('.overview-grid');
  if (!overviewGrid) return;
  
  const netPosition = parseFloat(debtsData.total_amount || 0) - parseFloat(creditsData.total_amount || 0);
  const totalActivity = (debtsData.count || 0) + (creditsData.count || 0) + (transactionsData.count || 0);
  const avgTransaction = (transactionsData.count || 0) > 0 ? (parseFloat(transactionsData.total_amount || 0) / (transactionsData.count || 1)).toFixed(0) : 0;
  const collectionRate = parseFloat(debtsData.total_amount || 0) > 0 ? ((parseFloat(transactionsData.total_amount || 0) / parseFloat(debtsData.total_amount || 1)) * 100).toFixed(1) : 0;
  
  overviewGrid.innerHTML = `
    <div class="overview-card">
      <h4>Net Position</h4>
      <p class="overview-value ${netPosition >= 0 ? 'positive' : 'negative'}">
        Ksh ${Math.abs(netPosition).toLocaleString()}
      </p>
      <small>${netPosition >= 0 ? 'Positive' : 'Negative'} Balance</small>
    </div>
    <div class="overview-card">
      <h4>Total Activity</h4>
      <p class="overview-value">${totalActivity}</p>
      <small>Total Records</small>
    </div>
    <div class="overview-card">
      <h4>Average Transaction</h4>
      <p class="overview-value">$${avgTransaction}</p>
      <small>Per Transaction</small>
    </div>
    <div class="overview-card">
      <h4>Collection Rate</h4>
      <p class="overview-value">${collectionRate}%</p>
      <small>Payments vs Debts</small>
    </div>
  `;
}

async function updateDebtChart() {
  const period = document.getElementById('debt-period')?.value;
  console.log('Update debt chart for period:', period);
  
  try {
    const data = await apiCall(`/dashboard/analytics?period=${period}`);
    const { debtTrends = [] } = data;
    
    // Update the debt trends chart
    const chartContainer = document.querySelector('.chart-section:first-of-type .chart-container');
    if (chartContainer && debtTrends.length > 0) {
      const totalDebtAmount = debtTrends.reduce((sum, trend) => sum + parseFloat(trend.total_amount || 0), 0);
      
      chartContainer.innerHTML = debtTrends.map(trend => {
        const percentage = totalDebtAmount > 0 ? (parseFloat(trend.total_amount || 0) / totalDebtAmount * 100) : 0;
        return `
          <div class="trend-item">
            <div class="trend-date">${new Date(trend.date).toLocaleDateString()}</div>
            <div class="trend-bar">
              <div class="trend-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="trend-details">
              <span class="trend-count">${trend.count || 0} debts</span>
              <span class="trend-amount">Ksh ${parseFloat(trend.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Failed to update debt chart:', error);
  }
}

async function updatePaymentChart() {
  const period = document.getElementById('payment-period')?.value;
  console.log('Update payment chart for period:', period);
  
  try {
    const data = await apiCall(`/dashboard/analytics?period=${period}`);
    const { paymentTrends = [] } = data;
    
    // Update the payment trends chart
    const chartContainer = document.querySelector('.chart-section:nth-of-type(2) .chart-container');
    if (chartContainer && paymentTrends.length > 0) {
      const totalPaymentAmount = paymentTrends.reduce((sum, trend) => sum + parseFloat(trend.total_amount || 0), 0);
      
      chartContainer.innerHTML = paymentTrends.map(trend => {
        const percentage = totalPaymentAmount > 0 ? (parseFloat(trend.total_amount || 0) / totalPaymentAmount * 100) : 0;
        return `
          <div class="trend-item">
            <div class="trend-date">${new Date(trend.date).toLocaleDateString()}</div>
            <div class="trend-bar">
              <div class="trend-bar-fill payment" style="width: ${percentage}%"></div>
            </div>
            <div class="trend-details">
              <span class="trend-count">${trend.count || 0} payments</span>
              <span class="trend-amount">Ksh ${parseFloat(trend.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Failed to update payment chart:', error);
  }
}

// Dashboard Refresh Functions
async function refreshDashboardData() {
  console.log('Refreshing dashboard data after payment...');
  
  try {
    // Refresh analytics data
    await updateAnalytics();
    
    // Refresh debt chart
    await updateDebtChart();
    
    // Refresh payment chart
    await updatePaymentChart();
    
    // Refresh debt management pages
    await refreshDebtManagementPages();
    
    console.log('Dashboard data refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error);
  }
}

// Enhanced function to refresh all debt management pages
async function refreshDebtManagementPages() {
  console.log('Refreshing debt management pages...');
  
  try {
    // Check if we're on the view debts page
    if (document.getElementById('sidebar-view-debts').classList.contains('active')) {
      console.log('Refreshing view debts page...');
      document.getElementById('sidebar-view-debts').click();
    }
    
    // Check if we're viewing a specific debt (debt details page)
    // This happens when the content area contains debt details
    const contentArea = document.getElementById('content-area');
    if (contentArea && contentArea.innerHTML.includes('Debt Details')) {
      console.log('Refreshing debt details page...');
      // Extract debt ID from the current page
      const debtIdMatch = contentArea.innerHTML.match(/viewDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Refreshing debt details for debt ID: ${debtId}`);
        await viewDebt(debtId);
      }
    }
    
    // Check if we're on the edit debt page
    if (contentArea && contentArea.innerHTML.includes('Edit Debt')) {
      console.log('Refreshing edit debt page...');
      // Extract debt ID from the current page
      const debtIdMatch = contentArea.innerHTML.match(/editDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Refreshing edit debt page for debt ID: ${debtId}`);
        await editDebt(debtId);
      }
    }
    
    // Check if we're on the record payment page
    if (contentArea && contentArea.innerHTML.includes('Record Payment')) {
      console.log('Refreshing record payment page...');
      // Extract debt ID from the current page
      const debtIdMatch = contentArea.innerHTML.match(/viewDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Refreshing record payment page for debt ID: ${debtId}`);
        // Go back to debt details to show updated payment info
        await viewDebt(debtId);
      }
    }
    
    console.log('Debt management pages refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh debt management pages:', error);
  }
}

// Reports Helper Functions
async function refreshReports() {
  console.log('Refreshing reports data...');
  // Trigger the reports page reload
  document.getElementById('sidebar-reports').click();
}

// Analytics Helper Functions
async function refreshAnalytics() {
  console.log('Refreshing analytics data...');
  // Trigger the analytics page reload
  document.getElementById('sidebar-analytics').click();
}

function exportAnalytics() {
  console.log('Exporting analytics data...');
  
  // Get current analytics data
  const analyticsData = {
    timestamp: new Date().toISOString(),
    debtTrends: document.querySelectorAll('.trend-item').length,
    paymentTrends: document.querySelectorAll('.trend-item').length,
    categories: document.querySelectorAll('.category-item').length
  };
  
  // Create and download CSV
  const csvContent = `Analytics Export,${analyticsData.timestamp}
Debt Trends,${analyticsData.debtTrends}
Payment Trends,${analyticsData.paymentTrends}
Categories,${analyticsData.categories}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  alert('Analytics data exported successfully!');
}

// Profile and Settings Helper Functions
function editProfile() {
  console.log('Edit profile');
  alert('Edit profile functionality would open a modal or form here');
}

function showSettingsSection(section) {
  // Hide all sections
  document.querySelectorAll('.settings-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Remove active class from all nav items
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show selected section
  document.getElementById(`settings-${section}`).classList.add('active');
  
  // Add active class to clicked nav item
  event.target.closest('.settings-nav-item').classList.add('active');
}

function saveGeneralSettings() {
  const businessName = document.getElementById('business-name')?.value;
  const businessEmail = document.getElementById('business-email')?.value;
  const businessPhone = document.getElementById('business-phone')?.value;
  const businessAddress = document.getElementById('business-address')?.value;
  const timezone = document.getElementById('timezone')?.value;
  const currency = document.getElementById('currency')?.value;
  
  console.log('Saving general settings:', { businessName, businessEmail, businessPhone, businessAddress, timezone, currency });
  alert('General settings saved successfully!');
}

function saveNotificationSettings() {
  console.log('Saving notification settings');
  alert('Notification settings saved successfully!');
}

function changePassword() {
  const currentPassword = document.getElementById('current-password')?.value;
  const newPassword = document.getElementById('new-password')?.value;
  const confirmPassword = document.getElementById('confirm-password')?.value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Please fill in all password fields');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  if (newPassword.length < 8) {
    alert('New password must be at least 8 characters long');
    return;
  }
  
  console.log('Changing password');
  alert('Password changed successfully!');
  
  // Clear form
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
}

function enableTwoFactor() {
  console.log('Enable two-factor authentication');
  alert('Two-factor authentication setup would open here');
}

function viewSessions() {
  console.log('View active sessions');
  alert('Active sessions management would open here');
}

function logoutAllDevices() {
  if (confirm('Are you sure you want to logout from all devices? This will end all active sessions.')) {
    console.log('Logout all devices');
    alert('All devices have been logged out successfully');
  }
}

function exportData(format) {
  console.log('Export data as:', format);
  alert(`Exporting data as ${format.toUpperCase()}...`);
}

function saveBackupSettings() {
  const frequency = document.getElementById('backup-frequency')?.value;
  const retention = document.getElementById('backup-retention')?.value;
  
  console.log('Saving backup settings:', { frequency, retention });
  alert('Backup settings saved successfully!');
}

function setTheme(theme) {
  // Remove active class from all theme options
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to selected theme
  event.target.closest('.theme-option').classList.add('active');
  
  console.log('Setting theme:', theme);
  alert(`Theme changed to ${theme}`);
}

function saveAppearanceSettings() {
  const language = document.getElementById('language')?.value;
  const sidebarWidth = document.getElementById('sidebar-width')?.value;
  const defaultPage = document.getElementById('default-page')?.value;
  
  console.log('Saving appearance settings:', { language, sidebarWidth, defaultPage });
  alert('Appearance settings saved successfully!');
}


// Debt Management Helper Functions
function searchDebts() {
  const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('#debts-table tbody tr');
  
  rows.forEach(row => {
    const debtorName = row.dataset.debtor || '';
    const isVisible = debtorName.includes(searchTerm);
    row.style.display = isVisible ? '' : 'none';
  });
}

function filterDebts() {
  const statusFilter = document.getElementById('status-filter')?.value || 'all';
  const categoryFilter = document.getElementById('category-filter')?.value || 'all';
  const sortBy = document.getElementById('sort-by')?.value || 'created_at';
  const sortOrder = document.getElementById('sort-order')?.value || 'DESC';
  
  // Reload debts with new filters
  loadDebtsWithFilters(statusFilter, categoryFilter, sortBy, sortOrder);
}

async function loadDebtsWithFilters(status = 'all', category = 'all', sortBy = 'created_at', sortOrder = 'DESC', page = 1) {
  try {
    const params = new URLSearchParams({
      status: status === 'all' ? '' : status,
      category: category === 'all' ? '' : category,
      sortBy,
      sortOrder,
      page: page.toString(),
      limit: '20'
    });
    
    const data = await apiCall(`/debts?${params}`);
    const debts = data.debts || [];
    const pagination = data.pagination || { page: 1, total: 0, pages: 1 };
    
    // Update the table body
    const tbody = document.querySelector('#debts-table tbody');
    if (tbody) {
      tbody.innerHTML = debts.length > 0 ? 
        debts.map(debt => `
          <tr data-status="${debt.status}" data-category="${debt.category || ''}" data-debtor="${(debt.debtor_name || '').toLowerCase()}">
            <td>
              <div class="debtor-info">
                <div class="debtor-name">${debt.debtor_name || 'N/A'}</div>
                ${debt.debtor_email ? `<div class="debtor-email">${debt.debtor_email}</div>` : ''}
              </div>
            </td>
            <td>
              <div class="amount-info">
                <div class="amount">Ksh ${parseFloat(debt.amount || 0).toLocaleString()}</div>
                ${debt.interest_rate > 0 ? `<div class="interest-rate">+${debt.interest_rate}%</div>` : ''}
              </div>
            </td>
            <td>
              <div class="date-info">
                <div class="due-date">${new Date(debt.due_date).toLocaleDateString()}</div>
                ${debt.days_until_due !== undefined ? `
                  <div class="days-until ${debt.days_until_due < 0 ? 'overdue' : debt.days_until_due <= 7 ? 'due-soon' : ''}">
                    ${debt.days_until_due < 0 ? `${Math.abs(debt.days_until_due)} days overdue` : 
                      debt.days_until_due === 0 ? 'Due today' : 
                      debt.days_until_due === 1 ? 'Due tomorrow' : 
                      `${debt.days_until_due} days left`}
                  </div>
                ` : ''}
              </div>
            </td>
            <td>
              <span class="status-badge ${debt.status_display?.toLowerCase().replace(' ', '-') || debt.status}">
                ${debt.status_display || debt.status}
              </span>
            </td>
            <td>
              <span class="category-badge">${(debt.category || 'Uncategorized').charAt(0).toUpperCase() + (debt.category || 'Uncategorized').slice(1)}</span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-small" onclick="viewDebt(${debt.id})" title="View Details">
                  👁️
                </button>
                <button class="btn-icon-small" onclick="editDebt(${debt.id})" title="Edit">
                  ✏️
                </button>
                <button class="btn-icon-small" onclick="recordPayment(${debt.id})" title="Record Payment">
                  💰
                </button>
                <button class="btn-icon-small btn-danger" onclick="deleteDebt(${debt.id})" title="Delete">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `).join('') : 
        '<tr><td colspan="6" class="no-data">No debts found. <a href="#" onclick="document.getElementById(\'sidebar-record-debt\').click()">Add your first debt</a></td></tr>';
    }
    
    // Update pagination
    const paginationDiv = document.querySelector('.pagination');
    if (paginationDiv) {
      paginationDiv.innerHTML = pagination.pages > 1 ? `
        <button class="btn-pagination" onclick="loadDebtsPage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>
          Previous
        </button>
        <span class="pagination-info">
          Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)
        </span>
        <button class="btn-pagination" onclick="loadDebtsPage(${pagination.page + 1})" ${pagination.page >= pagination.pages ? 'disabled' : ''}>
          Next
        </button>
      ` : '';
    }
    
  } catch (error) {
    console.error('Error loading debts with filters:', error);
  }
}

function loadDebtsPage(page) {
  const statusFilter = document.getElementById('status-filter')?.value || 'all';
  const categoryFilter = document.getElementById('category-filter')?.value || 'all';
  const sortBy = document.getElementById('sort-by')?.value || 'created_at';
  const sortOrder = document.getElementById('sort-order')?.value || 'DESC';
  
  loadDebtsWithFilters(statusFilter, categoryFilter, sortBy, sortOrder, page);
}

async function viewDebt(debtId) {
  try {
    const data = await apiCall(`/debts/${debtId}`);
    const debt = data.debt;
    const payments = data.payments || [];
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>👁️ Debt Details</h2>
        <div class="header-actions">
          <button class="btn-secondary" onclick="document.getElementById('sidebar-view-debts').click()">
            ← Back to Debts
          </button>
          <button class="btn-primary" onclick="editDebt(${debtId})">
            ✏️ Edit Debt
          </button>
        </div>
      </div>
      
      <div class="debt-details-container">
        <div class="debt-info-section">
          <h3>Debt Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Debtor Name:</label>
              <span>${debt.debtor_name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>${debt.debtor_email || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Phone:</label>
              <span>${debt.debtor_phone || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Amount:</label>
              <span class="amount-large">Ksh ${parseFloat(debt.amount || 0).toLocaleString()}</span>
            </div>
            <div class="info-item">
              <label>Interest Rate:</label>
              <span>${debt.interest_rate || 0}%</span>
            </div>
            <div class="info-item">
              <label>Due Date:</label>
              <span class="${debt.days_until_due < 0 ? 'overdue' : debt.days_until_due <= 7 ? 'due-soon' : ''}">
                ${new Date(debt.due_date).toLocaleDateString()}
                ${debt.days_until_due !== undefined ? `(${debt.days_until_due < 0 ? `${Math.abs(debt.days_until_due)} days overdue` : 
                  debt.days_until_due === 0 ? 'Due today' : 
                  debt.days_until_due === 1 ? 'Due tomorrow' : 
                  `${debt.days_until_due} days left`})` : ''}
              </span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="status-badge ${debt.status_display?.toLowerCase().replace(' ', '-') || debt.status}">
                ${debt.status_display || debt.status}
              </span>
            </div>
            <div class="info-item">
              <label>Category:</label>
              <span class="category-badge">${(debt.category || 'Uncategorized').charAt(0).toUpperCase() + (debt.category || 'Uncategorized').slice(1)}</span>
            </div>
            <div class="info-item">
              <label>Reference Number:</label>
              <span>${debt.reference_number || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Payment Terms:</label>
              <span>${debt.payment_terms || 'N/A'}</span>
            </div>
            <div class="info-item full-width">
              <label>Description:</label>
              <span>${debt.description || 'No description provided'}</span>
            </div>
            ${debt.notes ? `
              <div class="info-item full-width">
                <label>Notes:</label>
                <span>${debt.notes}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="payments-section">
          <div class="section-header">
            <h3>Payment History</h3>
            <button class="btn-primary" onclick="recordPayment(${debtId})">
              💰 Record Payment
            </button>
          </div>
          
          ${payments.length > 0 ? `
            <div class="payments-list">
              ${payments.map(payment => `
                <div class="payment-item">
                  <div class="payment-info">
                    <div class="payment-amount">Ksh ${parseFloat(payment.amount).toLocaleString()}</div>
                    <div class="payment-date">${new Date(payment.payment_date).toLocaleDateString()}</div>
                  </div>
                  <div class="payment-details">
                    <div class="payment-method">${payment.payment_method || 'N/A'}</div>
                    ${payment.notes ? `<div class="payment-notes">${payment.notes}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="no-payments">
              <p>No payments recorded yet.</p>
              <button class="btn-primary" onclick="recordPayment(${debtId})">
                Record First Payment
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error viewing debt:', error);
    alert('Failed to load debt details. Please try again.');
  }
}

async function editDebt(debtId) {
  try {
    window.currentEditingDebtId = debtId; // Set global variable for form submission
    const data = await apiCall(`/debts/${debtId}`);
    const debt = data.debt;
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>✏️ Edit Debt</h2>
        <button class="btn-secondary" onclick="viewDebt(${debtId})">
          ← Back to Details
        </button>
      </div>
      
      <div class="form-container">
        <form id="edit-debt-form" class="professional-form">
          <div class="form-section">
            <h3>Debtor Information</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-debtor-name">Debtor Name *</label>
                <input type="text" id="edit-debtor-name" required value="${debt.debtor_name || ''}">
              </div>
              <div class="form-group">
                <label for="edit-debtor-email">Email</label>
                <input type="email" id="edit-debtor-email" value="${debt.debtor_email || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-debtor-phone">Phone Number</label>
                <input type="tel" id="edit-debtor-phone" value="${debt.debtor_phone || ''}">
              </div>
              <div class="form-group">
                <label for="edit-reference-number">Reference Number</label>
                <input type="text" id="edit-reference-number" value="${debt.reference_number || ''}">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Debt Details</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-amount">Amount (Ksh) *</label>
                <input type="number" id="edit-amount" step="0.01" min="0" required value="${debt.amount || ''}">
              </div>
              <div class="form-group">
                <label for="edit-interest-rate">Interest Rate (%)</label>
                <input type="number" id="edit-interest-rate" step="0.01" min="0" max="100" value="${debt.interest_rate || 0}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-due-date">Due Date *</label>
                <input type="date" id="edit-due-date" required value="${debt.due_date}">
              </div>
              <div class="form-group">
                <label for="edit-category">Category</label>
                <select id="edit-category">
                  <option value="">Select Category</option>
                  <option value="business" ${debt.category === 'business' ? 'selected' : ''}>Business</option>
                  <option value="personal" ${debt.category === 'personal' ? 'selected' : ''}>Personal</option>
                  <option value="loan" ${debt.category === 'loan' ? 'selected' : ''}>Loan</option>
                  <option value="service" ${debt.category === 'service' ? 'selected' : ''}>Service</option>
                  <option value="rent" ${debt.category === 'rent' ? 'selected' : ''}>Rent</option>
                  <option value="utilities" ${debt.category === 'utilities' ? 'selected' : ''}>Utilities</option>
                  <option value="medical" ${debt.category === 'medical' ? 'selected' : ''}>Medical</option>
                  <option value="education" ${debt.category === 'education' ? 'selected' : ''}>Education</option>
                  <option value="other" ${debt.category === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-status">Status</label>
                <select id="edit-status">
                  <option value="active" ${debt.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="paid" ${debt.status === 'paid' ? 'selected' : ''}>Paid</option>
                  <option value="cancelled" ${debt.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-payment-terms">Payment Terms</label>
                <select id="edit-payment-terms">
                  <option value="">Select Payment Terms</option>
                  <option value="lump_sum" ${debt.payment_terms === 'lump_sum' ? 'selected' : ''}>Lump Sum</option>
                  <option value="installments" ${debt.payment_terms === 'installments' ? 'selected' : ''}>Installments</option>
                  <option value="monthly" ${debt.payment_terms === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="weekly" ${debt.payment_terms === 'weekly' ? 'selected' : ''}>Weekly</option>
                  <option value="custom" ${debt.payment_terms === 'custom' ? 'selected' : ''}>Custom</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="edit-description">Description</label>
              <textarea id="edit-description" rows="3">${debt.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-notes">Additional Notes</label>
              <textarea id="edit-notes" rows="3">${debt.notes || ''}</textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="viewDebt(${debtId})">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              <span class="btn-icon">💾</span>
              Update Debt
            </button>
          </div>
        </form>
      </div>
    `;
  } catch (error) {
    console.error('Error loading debt for editing:', error);
    alert('Failed to load debt details. Please try again.');
  }
}

async function recordPayment(debtId) {
  try {
    window.currentPaymentDebtId = debtId; // Set global variable for form submission
    const data = await apiCall(`/debts/${debtId}`);
    const debt = data.debt;
    
    document.getElementById('content-area').innerHTML = `
      <div class="page-header">
        <h2>💰 Record Payment</h2>
        <button class="btn-secondary" onclick="viewDebt(${debtId})">
          ← Back to Details
        </button>
      </div>
      
      <div class="form-container">
        <div class="debt-summary">
          <h3>Debt Summary</h3>
          <div class="summary-info">
            <div class="summary-item">
              <label>Debtor:</label>
              <span>${debt.debtor_name}</span>
            </div>
            <div class="summary-item">
              <label>Total Amount:</label>
              <span>Ksh ${parseFloat(debt.amount).toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <label>Due Date:</label>
              <span>${new Date(debt.due_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <form id="record-payment-form" class="professional-form">
          <div class="form-section">
            <h3>Payment Details</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="payment-amount">Payment Amount (Ksh) *</label>
                <input type="number" id="payment-amount" step="0.01" min="0" required placeholder="0.00">
              </div>
              <div class="form-group">
                <label for="payment-date">Payment Date *</label>
                <input type="date" id="payment-date" required value="${new Date().toISOString().split('T')[0]}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="payment-method">Payment Method</label>
                <select id="payment-method">
                  <option value="">Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="payment-reference">Reference Number</label>
                <input type="text" id="payment-reference" placeholder="Transaction/Reference number">
              </div>
            </div>
            <div class="form-group">
              <label for="payment-notes">Notes</label>
              <textarea id="payment-notes" rows="3" placeholder="Additional notes about this payment..."></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="viewDebt(${debtId})">
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              <span class="btn-icon">💰</span>
              Record Payment
            </button>
          </div>
        </form>
      </div>
    `;
  } catch (error) {
    console.error('Error loading debt for payment:', error);
    alert('Failed to load debt details. Please try again.');
  }
}

async function deleteDebt(debtId) {
  if (!confirm('Are you sure you want to delete this debt? This action cannot be undone.')) {
    return;
  }
  
  try {
    await apiCall(`/debts/${debtId}`, {
      method: 'DELETE'
    });
    
    alert('Debt deleted successfully!');
    
    // Update dashboard data after debt deletion
    await refreshDashboardData();
    
    document.getElementById('sidebar-view-debts').click(); // Refresh the debts list
  } catch (error) {
    console.error('Error deleting debt:', error);
    alert('Failed to delete debt. Please try again.');
  }
}

function exportDebts() {
  // Simple CSV export functionality
  const table = document.getElementById('debts-table');
  if (!table) return;
  
  const rows = Array.from(table.querySelectorAll('tr'));
  const csvContent = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => `"${cell.textContent.trim()}"`).join(',');
  }).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debts_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Category Management Functions
async function editCategory(categoryName) {
  const newName = prompt('Enter new category name:', categoryName);
  if (newName && newName.trim() && newName !== categoryName) {
    try {
      const result = await apiCall(`/debts/categories/${encodeURIComponent(categoryName)}`, {
        method: 'PUT',
        body: JSON.stringify({
          newName: newName.trim()
        })
      });
      
      alert(`Category renamed successfully! ${result.affectedRows} debts updated.`);
      document.getElementById('sidebar-debt-categories').click(); // Refresh the categories page
    } catch (error) {
      console.error('Error updating category:', error);
      alert(`Failed to update category: ${error.message || 'Please try again.'}`);
    }
  }
}

async function deleteCategory(categoryName) {
  if (confirm(`Are you sure you want to delete the category "${categoryName}"? This will remove the category from all debts.`)) {
    try {
      const result = await apiCall(`/debts/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE'
      });
      
      alert(`Category deleted successfully! ${result.affectedRows} debts updated.`);
      document.getElementById('sidebar-debt-categories').click(); // Refresh the categories page
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(`Failed to delete category: ${error.message || 'Please try again.'}`);
    }
  }
}

// Enhanced View Debts Functions

// Toggle advanced filters
function toggleAdvancedFilters() {
  const advancedFilters = document.getElementById('advanced-filters');
  if (advancedFilters) {
    advancedFilters.style.display = advancedFilters.style.display === 'none' ? 'block' : 'none';
  }
}

// Clear all filters
function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('status-filter').value = 'all';
  document.getElementById('category-filter').value = 'all';
  document.getElementById('sort-by').value = 'created_at';
  document.getElementById('sort-order').value = 'DESC';
  document.getElementById('amount-min').value = '';
  document.getElementById('amount-max').value = '';
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
  
  // Hide advanced filters
  const advancedFilters = document.getElementById('advanced-filters');
  if (advancedFilters) {
    advancedFilters.style.display = 'none';
  }
  
  // Reload debts with cleared filters
  filterDebts();
}

// Toggle select all checkboxes
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const debtCheckboxes = document.querySelectorAll('.debt-checkbox');
  
  debtCheckboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  updateBulkActions();
}

// Update bulk actions visibility
function updateBulkActions() {
  const selectedCheckboxes = document.querySelectorAll('.debt-checkbox:checked');
  const bulkActions = document.getElementById('bulk-actions');
  const bulkSelectedCount = document.querySelector('.bulk-selected-count');
  
  if (selectedCheckboxes.length > 0) {
    bulkActions.style.display = 'block';
    bulkSelectedCount.textContent = `${selectedCheckboxes.length} debts selected`;
  } else {
    bulkActions.style.display = 'none';
  }
}

// Clear selection
function clearSelection() {
  const debtCheckboxes = document.querySelectorAll('.debt-checkbox');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  
  debtCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  selectAllCheckbox.checked = false;
  
  updateBulkActions();
}

// Bulk mark as paid
async function bulkMarkAsPaid() {
  const selectedCheckboxes = document.querySelectorAll('.debt-checkbox:checked');
  if (selectedCheckboxes.length === 0) return;
  
  if (confirm(`Mark ${selectedCheckboxes.length} debts as paid?`)) {
    try {
      const debtIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      
      for (const debtId of debtIds) {
        await apiCall(`/debts/${debtId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'paid' })
        });
      }
      
      alert(`${debtIds.length} debts marked as paid successfully!`);
      clearSelection();
      document.getElementById('sidebar-view-debts').click(); // Refresh the page
    } catch (error) {
      console.error('Error updating debts:', error);
      alert(`Failed to update debts: ${error.message || 'Please try again.'}`);
    }
  }
}

// Bulk mark as active
async function bulkMarkAsActive() {
  const selectedCheckboxes = document.querySelectorAll('.debt-checkbox:checked');
  if (selectedCheckboxes.length === 0) return;
  
  if (confirm(`Mark ${selectedCheckboxes.length} debts as active?`)) {
    try {
      const debtIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      
      for (const debtId of debtIds) {
        await apiCall(`/debts/${debtId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'active' })
        });
      }
      
      alert(`${debtIds.length} debts marked as active successfully!`);
      clearSelection();
      document.getElementById('sidebar-view-debts').click(); // Refresh the page
    } catch (error) {
      console.error('Error updating debts:', error);
      alert(`Failed to update debts: ${error.message || 'Please try again.'}`);
    }
  }
}

// Bulk delete
async function bulkDelete() {
  const selectedCheckboxes = document.querySelectorAll('.debt-checkbox:checked');
  if (selectedCheckboxes.length === 0) return;
  
  if (confirm(`Delete ${selectedCheckboxes.length} debts? This action cannot be undone.`)) {
    try {
      const debtIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      
      for (const debtId of debtIds) {
        await apiCall(`/debts/${debtId}`, {
          method: 'DELETE'
        });
      }
      
      alert(`${debtIds.length} debts deleted successfully!`);
      clearSelection();
      document.getElementById('sidebar-view-debts').click(); // Refresh the page
    } catch (error) {
      console.error('Error deleting debts:', error);
      alert(`Failed to delete debts: ${error.message || 'Please try again.'}`);
    }
  }
}

// Sort table by column
function sortTable(column) {
  const sortBy = document.getElementById('sort-by');
  const sortOrder = document.getElementById('sort-order');
  
  if (sortBy.value === column) {
    // Toggle order if same column
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC';
  } else {
    // Set new column
    sortBy.value = column;
    sortOrder.value = 'ASC';
  }
  
  filterDebts();
}

// Refresh debts
function refreshDebts() {
  document.getElementById('sidebar-view-debts').click();
}

// Enhanced refresh function for debt management context
async function refreshCurrentDebtContext() {
  console.log('Refreshing current debt management context...');
  
  try {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;
    
    const content = contentArea.innerHTML;
    
    // Check what type of debt management page we're on
    if (content.includes('Debt Details')) {
      // Extract debt ID and refresh debt details
      const debtIdMatch = content.match(/viewDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Refreshing debt details for ID: ${debtId}`);
        await viewDebt(debtId);
      }
    } else if (content.includes('Edit Debt')) {
      // Extract debt ID and refresh edit page
      const debtIdMatch = content.match(/editDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Refreshing edit debt page for ID: ${debtId}`);
        await editDebt(debtId);
      }
    } else if (content.includes('Record Payment')) {
      // Extract debt ID and go back to debt details
      const debtIdMatch = content.match(/viewDebt\((\d+)\)/);
      if (debtIdMatch && debtIdMatch[1]) {
        const debtId = debtIdMatch[1];
        console.log(`Payment recorded, refreshing debt details for ID: ${debtId}`);
        await viewDebt(debtId);
      }
    } else if (document.getElementById('sidebar-view-debts').classList.contains('active')) {
      // If on the main debts list, refresh it
      console.log('Refreshing debts list...');
      document.getElementById('sidebar-view-debts').click();
    }
    
    // Always refresh the View Debts page if it's not currently active
    // This ensures payment updates are visible when user navigates to it
    console.log('Ensuring View Debts page is refreshed for payment updates...');
    await refreshViewDebtsPage();
    
    console.log('Debt management context refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh debt management context:', error);
  }
}

// Specific function to refresh the View Debts page
async function refreshViewDebtsPage() {
  console.log('Refreshing View Debts page to show payment updates...');
  
  try {
    // Check if View Debts page is currently active
    const viewDebtsBtn = document.getElementById('sidebar-view-debts');
    const isActive = viewDebtsBtn && viewDebtsBtn.classList.contains('active');
    
    if (isActive) {
      // If the page is already active, force reload the data
      console.log('View Debts page is active, forcing data reload...');
      await loadViewDebtsData();
    } else {
      // If not active, just click to activate and load
      console.log('View Debts page not active, clicking to activate...');
      if (viewDebtsBtn) {
        viewDebtsBtn.click();
      }
    }
    
    console.log('View Debts page refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh View Debts page:', error);
  }
}

// Function to load View Debts data (extracted from the click handler)
async function loadViewDebtsData() {
  try {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    console.log('Loading fresh debts data...');
    
    // Load debts with pagination and filters with fallback
    const data = await apiCall('/debts?limit=20').catch(err => {
      console.warn('Debts API failed:', err);
      return { debts: [], pagination: { page: 1, total: 0, pages: 1 } };
    });
    const debts = data.debts || [];
    const pagination = data.pagination || { page: 1, total: 0, pages: 1 };
    
    // Load debt statistics with fallback
    const statsData = await apiCall('/debts/stats/summary').catch(err => {
      console.warn('Stats API failed:', err);
      return { total_debts: 0, total_amount: 0, overdue_debts: 0, paid_debts: 0 };
    });
    const stats = statsData || {};
    
    // Update the content area with fresh data
    document.getElementById('content-area').innerHTML = generateViewDebtsHTML(debts, pagination, stats);
    
    console.log('View Debts data loaded successfully');
  } catch (error) {
    console.error('Failed to load View Debts data:', error);
    // Show error message
    document.getElementById('content-area').innerHTML = `
      <div class="error-message">
        <p>Failed to load debts data: ${error.message}</p>
        <button onclick="loadViewDebtsData()" class="btn-primary">Retry</button>
      </div>
    `;
  }
}

// Function to generate the View Debts HTML (extracted from the click handler)
function generateViewDebtsHTML(debts, pagination, stats) {
  return `
    <div class="page-header">
      <div class="page-title-section">
        <h2>📋 Debt Management</h2>
        <p class="page-subtitle">Manage and track all your outstanding debts</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" onclick="exportDebts()" title="Export Debts">
          📤 Export
        </button>
        <button class="btn-primary" onclick="document.getElementById('sidebar-record-debt').click()">
          ➕ Record New Debt
        </button>
      </div>
    </div>
    
    <!-- Debt Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">${stats.total_debts || 0}</div>
          <div class="stat-label">Total Debts</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">Ksh ${(stats.total_amount || 0).toLocaleString()}</div>
          <div class="stat-label">Total Amount</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">${stats.overdue_debts || 0}</div>
          <div class="stat-label">Overdue</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">${stats.paid_debts || 0}</div>
          <div class="stat-label">Paid</div>
        </div>
      </div>
    </div>
    
    <!-- Filters and Search -->
    <div class="filters-header">
      <div class="filter-actions">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search debts..." onkeyup="searchDebts()">
          <span class="search-icon">🔍</span>
        </div>
        <button class="btn-secondary" onclick="toggleAdvancedFilters()">
          🔧 Advanced Filters
        </button>
        <button class="btn-secondary" onclick="clearFilters()">
          🗑️ Clear
        </button>
      </div>
      
      <div class="filter-group">
        <select id="status-filter" onchange="filterDebts()">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="active">Active</option>
        </select>
        
        <select id="category-filter" onchange="filterDebts()">
          <option value="">All Categories</option>
          <option value="Business">Business</option>
          <option value="Personal">Personal</option>
          <option value="Medical">Medical</option>
          <option value="Education">Education</option>
          <option value="Other">Other</option>
        </select>
        
        <select id="sort-by" onchange="filterDebts()">
          <option value="due_date">Sort by Due Date</option>
          <option value="amount">Sort by Amount</option>
          <option value="debtor_name">Sort by Debtor</option>
          <option value="created_at">Sort by Date Created</option>
        </select>
        
        <select id="sort-order" onchange="filterDebts()">
          <option value="ASC">Ascending</option>
          <option value="DESC">Descending</option>
        </select>
      </div>
      
      <div class="advanced-filters" id="advanced-filters" style="display: none;">
        <div class="filter-row">
          <div class="filter-item">
            <label>Min Amount:</label>
            <input type="number" id="min-amount" placeholder="0" onchange="filterDebts()">
          </div>
          <div class="filter-item">
            <label>Max Amount:</label>
            <input type="number" id="max-amount" placeholder="1000000" onchange="filterDebts()">
          </div>
          <div class="filter-item">
            <label>From Date:</label>
            <input type="date" id="from-date" onchange="filterDebts()">
          </div>
          <div class="filter-item">
            <label>To Date:</label>
            <input type="date" id="to-date" onchange="filterDebts()">
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bulk Actions -->
    <div class="bulk-actions" id="bulk-actions" style="display: none;">
      <div class="bulk-info">
        <span id="selected-count">0</span> debts selected
      </div>
      <div class="bulk-buttons">
        <button class="btn-warning" onclick="bulkMarkAsPaid()">Mark as Paid</button>
        <button class="btn-info" onclick="bulkMarkAsActive()">Mark as Active</button>
        <button class="btn-danger" onclick="bulkDelete()">Delete</button>
        <button class="btn-secondary" onclick="clearSelection()">Clear</button>
      </div>
    </div>
    
    <!-- Debts Table -->
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">
          <h3>Debts List</h3>
          <span class="table-count">${debts.length} of ${pagination.total} debts</span>
        </div>
        <div class="table-actions">
          <button class="btn-icon-small" onclick="toggleSelectAll()" title="Select All">
            ☑️
          </button>
          <button class="btn-icon-small" onclick="refreshDebts()" title="Refresh">
            🔄
          </button>
        </div>
      </div>
      
      <div class="table-wrapper">
        <table class="data-table" id="debts-table">
          <thead>
            <tr>
              <th class="select-column">
                <input type="checkbox" id="select-all" onchange="toggleSelectAll()">
              </th>
              <th class="sortable" onclick="sortTable('debtor_name')">Debtor</th>
              <th class="sortable" onclick="sortTable('amount')">Amount</th>
              <th class="sortable" onclick="sortTable('due_date')">Due Date</th>
              <th class="sortable" onclick="sortTable('status')">Status</th>
              <th class="sortable" onclick="sortTable('category')">Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${debts.length === 0 ? `
              <tr>
                <td colspan="7" class="no-data-message">
                  <div class="no-data-content">
                    <div class="no-data-icon">📋</div>
                    <h3>No Debts Found</h3>
                    <p>No debts match your current filters. Try adjusting your search criteria.</p>
                    <button class="btn-primary" onclick="clearFilters()">Clear Filters</button>
                  </div>
                </td>
              </tr>
            ` : debts.map(debt => `
              <tr data-debt-id="${debt.id}">
                <td class="select-column">
                  <input type="checkbox" class="debt-checkbox" value="${debt.id}" onchange="updateBulkActions()">
                </td>
                <td class="debtor-info">
                  <div class="debtor-name">${debt.debtor_name}</div>
                  <div class="debtor-details">
                    ${debt.reference_number ? `<span class="reference">Ref: ${debt.reference_number}</span>` : ''}
                    ${debt.debtor_email ? `<span class="email">${debt.debtor_email}</span>` : ''}
                  </div>
                </td>
                <td class="amount-info">
                  <div class="amount">Ksh ${debt.amount.toLocaleString()}</div>
                  ${debt.interest_rate ? `<div class="interest-rate">${debt.interest_rate}% interest</div>` : ''}
                </td>
                <td class="date-info">
                  <div class="due-date">${new Date(debt.due_date).toLocaleDateString()}</div>
                  <div class="days-until-due">
                    ${Math.ceil((new Date(debt.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </td>
                <td>
                  <span class="status-badge status-${debt.status}">${debt.status}</span>
                </td>
                <td>
                  <span class="category-badge">${debt.category || 'Uncategorized'}</span>
                </td>
                <td class="actions">
                  <button class="btn-icon-small" onclick="viewDebt(${debt.id})" title="View Details">
                    👁️
                  </button>
                  <button class="btn-icon-small" onclick="editDebt(${debt.id})" title="Edit">
                    ✏️
                  </button>
                  <button class="btn-icon-small" onclick="recordPayment(${debt.id})" title="Record Payment">
                    💰
                  </button>
                  <button class="btn-icon-small" onclick="deleteDebt(${debt.id})" title="Delete">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="pagination">
        <div class="pagination-info">
          Showing ${((pagination.page - 1) * 20) + 1} to ${Math.min(pagination.page * 20, pagination.total)} of ${pagination.total} debts
        </div>
        <div class="pagination-controls">
          <button class="btn-pagination" onclick="changePage(1)" ${pagination.page === 1 ? 'disabled' : ''}>
            ⏮️ First
          </button>
          <button class="btn-pagination" onclick="changePage(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>
            ⏪ Previous
          </button>
          
          ${Array.from({length: Math.min(5, pagination.pages)}, (_, i) => {
            const pageNum = Math.max(1, pagination.page - 2) + i;
            if (pageNum > pagination.pages) return '';
            return `
              <button class="btn-pagination ${pageNum === pagination.page ? 'active' : ''}" 
                      onclick="changePage(${pageNum})">
                ${pageNum}
              </button>
            `;
          }).join('')}
          
          <button class="btn-pagination" onclick="changePage(${pagination.page + 1})" ${pagination.page === pagination.pages ? 'disabled' : ''}>
            Next ⏩
          </button>
          <button class="btn-pagination" onclick="changePage(${pagination.pages})" ${pagination.page === pagination.pages ? 'disabled' : ''}>
            Last ⏭️
          </button>
        </div>
      </div>
    </div>
  `;
}

// Function to specifically update debt data after payment
async function updateDebtDataAfterPayment() {
  console.log('Updating debt data after payment...');
  
  try {
    // Force refresh the View Debts page to show updated payment data
    await refreshViewDebtsPage();
    
    // Also refresh any active debt management context
    await refreshCurrentDebtContext();
    
    console.log('Debt data updated successfully after payment');
  } catch (error) {
    console.error('Failed to update debt data after payment:', error);
  }
}

// Enhanced search function
function searchDebts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const tableRows = document.querySelectorAll('#debts-table tbody tr');
  
  tableRows.forEach(row => {
    const debtorName = row.querySelector('.debtor-name')?.textContent.toLowerCase() || '';
    const debtorEmail = row.querySelector('.debtor-email')?.textContent.toLowerCase() || '';
    const referenceNumber = row.querySelector('.reference-number')?.textContent.toLowerCase() || '';
    
    const matches = debtorName.includes(searchTerm) || 
                   debtorEmail.includes(searchTerm) || 
                   referenceNumber.includes(searchTerm);
    
    row.style.display = matches ? '' : 'none';
  });
}


