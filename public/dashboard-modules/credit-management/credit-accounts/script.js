// Credit Accounts Script
(function() {
    'use strict';

    // Global variables
    let accounts = [];
    let filteredAccounts = [];
    let currentSort = 'name';
    let isLoading = false;
    let creditors = []; // track creditors for overview

    // Initialize module
    function initializeModule() {
        console.log('Credit Accounts: Initializing module...');
        console.log('Credit Accounts: DOM elements check:', {
            'accounts-grid': !!document.getElementById('accounts-grid'),
            'total-accounts': !!document.getElementById('total-accounts'),
            'total-limit': !!document.getElementById('total-limit'),
            'available-credit': !!document.getElementById('available-credit'),
            'avg-utilization': !!document.getElementById('avg-utilization')
        });
        
        // Check if we're already loaded
        if (accounts.length > 0) {
            console.log('Credit Accounts: Already have accounts, skipping load');
            updateQuickStats();
            renderAccounts();
            return;
        }
        
        console.log('Credit Accounts: Starting loadAccounts()...');
        loadAccounts();
        setupEventListeners();
        // Load creditors to reflect in quick stats
        loadCreditors();
    }

    // Setup event listeners
    function setupEventListeners() {
        // New account form submission
        const newAccountForm = document.getElementById('new-account-form');
        if (newAccountForm) {
            newAccountForm.addEventListener('submit', handleNewAccountSubmit);
        }

        // Search input
        const searchInput = document.getElementById('search-accounts');
        if (searchInput) {
            searchInput.addEventListener('input', filterAccounts);
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', filterAccounts);
        }

        // Sort select
        const sortSelect = document.getElementById('sort-accounts');
        if (sortSelect) {
            sortSelect.addEventListener('change', sortAccounts);
        }

        // New creditor form submission
        const newCreditorForm = document.getElementById('new-creditor-form');
        if (newCreditorForm) {
            newCreditorForm.addEventListener('submit', handleNewCreditorSubmit);
        }
    }

    // Load accounts from API with timeout and retry
    async function loadAccounts() {
        console.log('Credit Accounts: loadAccounts() called, isLoading:', isLoading);
        
        if (isLoading) {
            console.log('Credit Accounts: Already loading, skipping...');
            return;
        }

        console.log('Credit Accounts: Setting isLoading = true and showing loading state...');
        isLoading = true;
        showLoadingState();
        console.log('Credit Accounts: Loading state shown');

        // Safety timeout - force error after 6 seconds (slightly longer than fetch timeout)
        const safetyTimeout = setTimeout(() => {
            console.error('Safety timeout triggered - forcing error display');
            isLoading = false;
            
            // Force update UI immediately
            const gridEl = document.getElementById('accounts-grid');
            if (gridEl) {
                const currentContent = gridEl.innerHTML || '';
                if (currentContent.includes('Loading') || currentContent === '') {
                    gridEl.innerHTML = `
                        <div class="error-message">
                            <h3>⚠️ Connection Timeout</h3>
                            <p>Request took too long (over 5 seconds). The server may be slow or unavailable.</p>
                            <button onclick="loadAccounts()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
                        </div>
                    `;
                }
            }
            // Reset stat values
            const totalEl = document.getElementById('total-accounts');
            const limitEl = document.getElementById('total-limit');
            const availableEl = document.getElementById('available-credit');
            const utilEl = document.getElementById('avg-utilization');
            if (totalEl && (totalEl.textContent === '...' || totalEl.textContent === '')) totalEl.textContent = '0';
            if (limitEl && (limitEl.textContent === '...' || limitEl.textContent === '')) limitEl.textContent = 'Ksh 0';
            if (availableEl && (availableEl.textContent === '...' || availableEl.textContent === '')) availableEl.textContent = 'Ksh 0';
            if (utilEl && (utilEl.textContent === '...' || utilEl.textContent === '')) utilEl.textContent = '0%';
        }, 6000);

        try {
            // Get token
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            
            console.log('Credit Accounts: Starting fetch to /api/credits...');
            console.log('Credit Accounts: Token exists:', !!token);
            const startTime = Date.now();
            
            // Log network timing
            if (window.performance && window.performance.timing) {
                console.log('Credit Accounts: Network timing:', {
                    navigationStart: window.performance.timing.navigationStart,
                    fetchStart: window.performance.timing.fetchStart,
                    requestStart: window.performance.timing.requestStart
                });
            }
            
            // Use AbortController for more reliable timeout (5 seconds - give server more time)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.warn('Fetch timeout after 5 seconds');
                controller.abort();
            }, 5000);
            
            // Fetch with timeout - use correct endpoint
            let response;
            try {
                response = await fetch('/api/credits', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const loadTime = Date.now() - startTime;
                console.log(`Credit Accounts: Fetch completed in ${loadTime}ms`);
                clearTimeout(safetyTimeout);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                clearTimeout(safetyTimeout);
                const loadTime = Date.now() - startTime;
                console.error(`Credit Accounts: Fetch failed after ${loadTime}ms:`, fetchError);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out after 5 seconds. The server may be slow. Please try again.');
                }
                throw fetchError;
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Authentication required. Please log in again.');
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Credit accounts data loaded:', data);

            // Handle response - endpoint returns { credits: [...], total: ..., message: ... }
            if (Array.isArray(data)) {
                accounts = data;
            } else if (data.credits) {
                accounts = Array.isArray(data.credits) ? data.credits : [];
            } else if (data.accounts) {
                accounts = Array.isArray(data.accounts) ? data.accounts : [];
            } else if (data.data) {
                accounts = Array.isArray(data.data) ? data.data : [];
            } else {
                accounts = [];
            }

            // Convert credits to account format if needed
            accounts = accounts.map(credit => {
                // If credit doesn't have account fields, create them from credit fields
                if (!credit.credit_limit && credit.amount !== undefined) {
                    return {
                        ...credit,
                        credit_limit: credit.amount || 0,
                        available_credit: (credit.amount || 0) - (credit.used_amount || 0),
                        utilization_percentage: credit.amount > 0 ? Math.round(((credit.used_amount || 0) / credit.amount) * 100) : 0,
                        account_name: credit.creditor_name || credit.name || 'Credit Account',
                        status: credit.status || 'active'
                    };
                }
                return credit;
            });

            filteredAccounts = [...accounts];
            
            console.log('Processed accounts:', accounts.length);
            
            updateQuickStats();
            renderAccounts();
            updateSortSelect();

        } catch (error) {
            clearTimeout(safetyTimeout);
            console.error('Error loading accounts:', error);
            const errorMessage = error.message || 'Failed to load credit accounts. Please try again.';
            showErrorState('accounts-grid', errorMessage);
            // Reset stat values on error
            const totalEl = document.getElementById('total-accounts');
            const limitEl = document.getElementById('total-limit');
            const availableEl = document.getElementById('available-credit');
            const utilEl = document.getElementById('avg-utilization');
            if (totalEl) totalEl.textContent = '0';
            if (limitEl) limitEl.textContent = 'Ksh 0';
            if (availableEl) availableEl.textContent = 'Ksh 0';
            if (utilEl) utilEl.textContent = '0%';
        } finally {
            isLoading = false;
        }
    }

    // Helper to show loading state
    function showLoadingState() {
        // Don't replace stat cards - just update their values to show loading
        const totalEl = document.getElementById('total-accounts');
        const limitEl = document.getElementById('total-limit');
        const availableEl = document.getElementById('available-credit');
        const utilEl = document.getElementById('avg-utilization');
        
        if (totalEl) totalEl.textContent = '...';
        if (limitEl) limitEl.textContent = '...';
        if (availableEl) availableEl.textContent = '...';
        if (utilEl) utilEl.textContent = '...';
        
        // Show loading in accounts grid
        const gridEl = document.getElementById('accounts-grid');
        if (gridEl) {
            gridEl.innerHTML = '<div class="loading-message">Loading credit accounts...</div>';
        }
    }

    // Helper to show error state
    function showErrorState(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button onclick="loadAccounts()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
        }
    }

    // Update quick stats
    function updateQuickStats() {
        const totalAccounts = accounts.length;
        const totalLimit = accounts.reduce((sum, account) => sum + (parseFloat(account.credit_limit) || 0), 0);
        const availableCredit = accounts.reduce((sum, account) => sum + (parseFloat(account.available_credit) || 0), 0);
        const avgUtilization = accounts.length > 0 ? 
            Math.round(accounts.reduce((sum, account) => sum + (parseFloat(account.utilization_percentage) || 0), 0) / accounts.length) : 0;
        const totalCreditors = Array.isArray(creditors) ? creditors.length : 0;
    
        const elAccounts = document.getElementById('total-accounts');
        if (elAccounts) elAccounts.textContent = totalAccounts;
        const elLimit = document.getElementById('total-limit');
        if (elLimit) elLimit.textContent = formatCurrency(totalLimit);
        const elAvailable = document.getElementById('available-credit');
        if (elAvailable) elAvailable.textContent = formatCurrency(availableCredit);
        const elUtil = document.getElementById('avg-utilization');
        if (elUtil) elUtil.textContent = `${avgUtilization}%`;
        const elCreditors = document.getElementById('total-creditors');
        if (elCreditors) elCreditors.textContent = String(totalCreditors);
    }

    // Render accounts
    function renderAccounts() {
        const container = document.getElementById('accounts-grid');
        if (!container) return;

        if (filteredAccounts.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>No Credit Accounts Found</h3>
                    <p>${accounts.length === 0 ? 'Create your first credit account to get started.' : 'No accounts match your search criteria.'}</p>
                    ${accounts.length === 0 ? `
                        <button class="btn-primary" onclick="createNewAccount()" style="margin-top: 1rem;">
                            <span class="btn-icon">➕</span>
                            Create First Account
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const accountsHtml = filteredAccounts.map(account => `
            <div class="account-card">
                <div class="account-header">
                    <div class="account-name">${account.account_name || account.creditor_name}</div>
                    <div class="account-status ${account.status}">${account.status}</div>
                </div>
                <div class="account-details">
                    <div class="detail-item">
                        <div class="detail-label">Credit Limit</div>
                        <div class="detail-value">${formatCurrency(account.credit_limit)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Available</div>
                        <div class="detail-value">${formatCurrency(account.available_credit)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Used</div>
                        <div class="detail-value">${formatCurrency(account.used_credit || 0)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Utilization</div>
                        <div class="detail-value">${account.utilization_percentage || 0}%</div>
                    </div>
                </div>
                <div class="utilization-bar">
                    <div class="utilization-fill" style="width: ${account.utilization_percentage || 0}%"></div>
                </div>
                <div class="account-actions">
                    <button class="btn-secondary" onclick="viewAccount('${account.id}')">View</button>
                    <button class="btn-primary" onclick="editAccount('${account.id}')">Edit</button>
                    <button class="btn-secondary" onclick="deleteAccount('${account.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = accountsHtml;
    }

    // Filter accounts
    function filterAccounts() {
        const searchTerm = document.getElementById('search-accounts').value.toLowerCase();
        const statusFilter = document.getElementById('status-filter').value;

        filteredAccounts = accounts.filter(account => {
            const matchesSearch = account.account_name.toLowerCase().includes(searchTerm) ||
                                (account.description && account.description.toLowerCase().includes(searchTerm));
            const matchesStatus = !statusFilter || account.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        renderAccounts();
    }

    // Sort accounts
    function sortAccounts() {
        const sortBy = document.getElementById('sort-accounts').value;
        currentSort = sortBy;

        filteredAccounts.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.account_name.localeCompare(b.account_name);
                case 'limit':
                    return (b.credit_limit || 0) - (a.credit_limit || 0);
                case 'utilization':
                    return (b.utilization_percentage || 0) - (a.utilization_percentage || 0);
                case 'created':
                    return new Date(b.created_at) - new Date(a.created_at);
                default:
                    return 0;
            }
        });

        renderAccounts();
    }

    // Update sort select to reflect current sort
    function updateSortSelect() {
        const sortSelect = document.getElementById('sort-accounts');
        if (sortSelect) {
            sortSelect.value = currentSort;
        }
    }

    // Show error state
    function showErrorState(message) {
        const container = document.getElementById('accounts-grid');
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="loadAccounts()" style="margin-top: 1rem;">
                        <span class="btn-icon">🔄</span>
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Handle new account form submission
    async function handleNewAccountSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const accountId = form.getAttribute('data-account-id');
        
        // Check if this is an edit operation
        if (accountId) {
            await handleEditAccountSubmit(event);
            return;
        }
        
        const formData = {
            account_name: document.getElementById('account-name').value,
            credit_limit: parseFloat(document.getElementById('credit-limit').value),
            category: document.getElementById('category').value,
            description: document.getElementById('description').value
        };

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/credits/accounts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            showNotification('Credit account created successfully!', 'success');
            closeNewAccountModal();
            loadAccounts(); // Refresh the list

        } catch (error) {
            console.error('Error creating account:', error);
            showNotification('Failed to create credit account. Please try again.', 'error');
        }
    }

    // Utility functions
    function formatCurrency(amount) {
        // Handle NaN, null, undefined, or non-numeric values
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
            return 'Ksh 0';
        }
        
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0
        }).format(numAmount);
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Event handlers
    window.createNewAccount = function() {
        const modal = document.getElementById('new-account-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('new-account-form').reset();
        }
    };

    window.closeNewAccountModal = function() {
        const modal = document.getElementById('new-account-modal');
        const form = document.getElementById('new-account-form');
        const modalTitle = modal.querySelector('h3');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset form and modal title
        if (form) {
            form.reset();
            form.removeAttribute('data-account-id');
        }
        
        if (modalTitle) {
            modalTitle.textContent = 'Create New Credit Account';
        }
    };

    // New Creditor modal handlers
    window.openNewCreditorModal = function() {
        const modal = document.getElementById('new-creditor-modal');
        if (modal) {
            modal.style.display = 'flex';
            const form = document.getElementById('new-creditor-form');
            if (form) form.reset();
        }
    };

    window.closeNewCreditorModal = function() {
        const modal = document.getElementById('new-creditor-modal');
        if (modal) {
            modal.style.display = 'none';
            const form = document.getElementById('new-creditor-form');
            if (form) form.reset();
        }
    };

    async function handleNewCreditorSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Adding...';
            }
            const creditor_name = document.getElementById('creditor-name').value.trim();
            const creditor_email = document.getElementById('creditor-email').value.trim();
            const creditor_phone = document.getElementById('creditor-phone').value.trim();
            const description = document.getElementById('creditor-description').value.trim();

            if (!creditor_name) {
                showNotification('Creditor name is required', 'error');
                return;
            }

            const payload = { creditor_name, creditor_email, creditor_phone, description };
            const result = await window.apiUtils.apiCall('/api/credits/creditors', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            showNotification(result.message || 'Creditor added successfully!', 'success');
            window.closeNewCreditorModal();
            // Refresh creditors and overview stats
            await loadCreditors();
        } catch (error) {
            console.error('Error adding creditor:', error);
            showNotification(error.message || 'Failed to add creditor. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText || 'Add Creditor';
            }
        }
    }

    // Account Details modal handlers and account actions
    function closeAccountDetailsModal() {
        const modal = document.getElementById('account-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function viewAccount(id) {
        const idStr = String(id);
        const account = (accounts || []).find(a => String(a.id) === idStr || String(a.account_id) === idStr)
            || (filteredAccounts || []).find(a => String(a.id) === idStr || String(a.account_id) === idStr);

        if (!account) {
            showNotification('Account not found', 'error');
            return;
        }

        const body = document.getElementById('account-details-body');
        const modal = document.getElementById('account-details-modal');
        const titleEl = document.getElementById('account-details-title');

        if (titleEl) {
            titleEl.textContent = account.account_name || 'Account Details';
        }

        if (body) {
            const used = account.used_credit ?? account.used_amount ?? 0;
            const limit = account.credit_limit ?? account.amount ?? 0;
            const available = account.available_credit ?? (limit - used);
            const utilization = account.utilization_percentage ?? (limit > 0 ? Math.round((used / limit) * 100) : 0);

            body.innerHTML = `
                <div class="details-grid">
                    <div class="detail-row"><span class="label">Name:</span> <span class="value">${account.account_name || '—'}</span></div>
                    <div class="detail-row"><span class="label">Status:</span> <span class="value">${account.status || 'active'}</span></div>
                    <div class="detail-row"><span class="label">Category:</span> <span class="value">${account.category || 'general'}</span></div>
                    <div class="detail-row"><span class="label">Credit Limit:</span> <span class="value">${formatCurrency(limit)}</span></div>
                    <div class="detail-row"><span class="label">Available:</span> <span class="value">${formatCurrency(available)}</span></div>
                    <div class="detail-row"><span class="label">Used:</span> <span class="value">${formatCurrency(used)}</span></div>
                    <div class="detail-row"><span class="label">Utilization:</span> <span class="value">${utilization}%</span></div>
                    <div class="detail-row"><span class="label">Created:</span> <span class="value">${account.created_at ? formatDate(account.created_at) : '—'}</span></div>
                    <div class="detail-row"><span class="label">Description:</span> <span class="value">${account.description || '—'}</span></div>
                </div>
                <div class="modal-actions" style="margin-top: 1rem; display: flex; gap: .5rem;">
                    <button class="btn-primary" onclick="editAccount('${account.id || account.account_id}')">Edit</button>
                    <button class="btn-secondary" onclick="deleteAccount('${account.id || account.account_id}')">Delete</button>
                    <button class="btn-secondary" onclick="closeAccountDetailsModal()">Close</button>
                </div>
            `;
        }

        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function editAccount(id) {
        const idStr = String(id);
        const account = (accounts || []).find(a => String(a.id) === idStr || String(a.account_id) === idStr)
            || (filteredAccounts || []).find(a => String(a.id) === idStr || String(a.account_id) === idStr);

        if (!account) {
            showNotification('Account not found', 'error');
            return;
        }

        const modal = document.getElementById('new-account-modal');
        const form = document.getElementById('new-account-form');
        const titleEl = modal ? modal.querySelector('h3') : null;

        if (form) {
            form.reset();
            form.setAttribute('data-account-id', account.id || account.account_id);
            const nameEl = document.getElementById('account-name');
            const limitEl = document.getElementById('credit-limit');
            const categoryEl = document.getElementById('category');
            const descEl = document.getElementById('description');
            if (nameEl) nameEl.value = account.account_name || '';
            if (limitEl) limitEl.value = (account.credit_limit ?? account.amount ?? 0);
            if (categoryEl) categoryEl.value = account.category || 'general';
            if (descEl) descEl.value = account.description || '';
        }

        if (titleEl) {
            titleEl.textContent = 'Edit Credit Account';
        }
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    async function handleEditAccountSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const accountId = form.getAttribute('data-account-id');
        if (!accountId) {
            showNotification('Missing account id for edit', 'error');
            return;
        }

        const formData = {
            account_name: document.getElementById('account-name').value,
            credit_limit: parseFloat(document.getElementById('credit-limit').value),
            category: document.getElementById('category').value,
            description: document.getElementById('description').value
        };

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const response = await fetch(`/api/credits/accounts/${accountId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await response.json();
            showNotification('Credit account updated successfully!', 'success');
            closeNewAccountModal();
            loadAccounts();
        } catch (error) {
            console.error('Error updating account:', error);
            showNotification('Failed to update credit account. Please try again.', 'error');
        }
    }

    async function deleteAccount(id) {
        if (!confirm('Are you sure you want to delete this credit account? This action cannot be undone.')) {
            return;
        }
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const response = await fetch(`/api/credits/accounts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            showNotification('Credit account deleted successfully!', 'success');
            loadAccounts();
        } catch (error) {
            console.error('Error deleting account:', error);
            showNotification('Failed to delete credit account. Please try again.', 'error');
        }
    }

    // Expose functions globally (single export block)
    window.closeAccountDetailsModal = closeAccountDetailsModal;
    window.viewAccountDetails = viewAccount;
    window.viewAccount = viewAccount;
    window.editAccount = editAccount;
    window.deleteAccount = deleteAccount;
    window.openNewCreditorModal = openNewCreditorModal;
    window.closeNewCreditorModal = closeNewCreditorModal;

    // Notification function
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Initialize when DOM is ready
    console.log('Credit Accounts: Script loaded, readyState:', document.readyState);
    
    function attemptInitialize() {
        console.log('Credit Accounts: Attempting to initialize...');
        const gridEl = document.getElementById('accounts-grid');
        const totalEl = document.getElementById('total-accounts');
        
        if (!gridEl || !totalEl) {
            console.warn('Credit Accounts: Required DOM elements not found yet:', {
                'accounts-grid': !!gridEl,
                'total-accounts': !!totalEl
            });
            return false;
        }
        
        console.log('Credit Accounts: All required elements found, initializing...');
        initializeModule();
        return true;
    }
    
    if (document.readyState === 'loading') {
        console.log('Credit Accounts: DOM still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Credit Accounts: DOM loaded, initializing...');
            if (!attemptInitialize()) {
                // Retry after a short delay if elements still not found
                setTimeout(() => {
                    console.log('Credit Accounts: Retrying initialization after delay...');
                    attemptInitialize();
                }, 500);
            }
        });
    } else {
        console.log('Credit Accounts: DOM already ready, initializing immediately...');
        if (!attemptInitialize()) {
            // Retry after a short delay if elements still not found
            setTimeout(() => {
                console.log('Credit Accounts: Retrying initialization after delay...');
                attemptInitialize();
            }, 500);
        }
    }
    
    // Also try to initialize after a delay (for dynamically loaded modules)
    setTimeout(() => {
        console.log('Credit Accounts: Delayed initialization check...');
        if (!accounts || accounts.length === 0) {
            console.log('Credit Accounts: No data loaded yet, attempting to load...');
            if (typeof loadAccounts === 'function') {
                console.log('Credit Accounts: loadAccounts function exists, calling it...');
                loadAccounts();
            } else {
                console.error('Credit Accounts: loadAccounts function not found!');
            }
        } else {
            console.log('Credit Accounts: Already have', accounts.length, 'accounts');
        }
    }, 2000);

    // Expose functions globally
    window.creditAccountsModule = {
        loadData: loadAccounts,
        refresh: loadAccounts,
        loadAccounts,
        refreshAccounts: loadAccounts,
        updateQuickStats,
        renderAccounts,
        filterAccounts,
        sortAccounts
    };

})();

// Load creditors from API and update overview
async function loadCreditors() {
    try {
        // Prefer shared api utility for auth handling
        if (window.apiUtils && typeof window.apiUtils.apiCall === 'function') {
            const result = await window.apiUtils.apiCall('/api/credits/creditors', {
                method: 'GET'
            });
            if (Array.isArray(result)) {
                creditors = result;
            } else if (Array.isArray(result?.creditors)) {
                creditors = result.creditors;
            } else {
                creditors = [];
            }
        } else {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const resp = await fetch('/api/credits/creditors', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            creditors = await resp.json();
        }
    } catch (e) {
        console.warn('Failed to load creditors for overview:', e);
        creditors = [];
    } finally {
        updateQuickStats();
    }
}
