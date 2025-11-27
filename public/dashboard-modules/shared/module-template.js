// Shared Dashboard Module Template
(function() {
    'use strict';

    // Global variables
    let moduleData = [];
    let filteredData = [];
    let currentSort = 'name';

    // Initialize module
    function initializeModule(config) {
        console.log(`Initializing ${config.moduleName}...`);
        loadData(config);
        setupEventListeners(config);
    }

    // Setup event listeners
    function setupEventListeners(config) {
        // Form submission
        const form = document.getElementById(config.formId);
        if (form) {
            form.addEventListener('submit', (e) => handleFormSubmit(e, config));
        }

        // Search input
        const searchInput = document.getElementById(config.searchId);
        if (searchInput) {
            searchInput.addEventListener('input', () => filterData(config));
        }

        // Status filter
        const statusFilter = document.getElementById(config.statusFilterId);
        if (statusFilter) {
            statusFilter.addEventListener('change', () => filterData(config));
        }

        // Sort select
        const sortSelect = document.getElementById(config.sortId);
        if (sortSelect) {
            sortSelect.addEventListener('change', () => sortData(config));
        }
    }

    // Load data from API
    async function loadData(config) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(config.apiEndpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            moduleData = await response.json();
            filteredData = [...moduleData];
            
            updateQuickStats(config);
            renderData(config);
            updateSortSelect(config);

        } catch (error) {
            console.error(`Error loading ${config.moduleName}:`, error);
            showErrorState(`Failed to load ${config.moduleName}. Please try again.`, config);
        }
    }

    // Update quick stats
    function updateQuickStats(config) {
        if (!config.statsConfig) return;

        config.statsConfig.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                const value = stat.calculate(moduleData);
                element.textContent = stat.format ? stat.format(value) : value;
            }
        });
    }

    // Render data
    function renderData(config) {
        const container = document.getElementById(config.gridId);
        if (!container) return;

        if (filteredData.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>No ${config.moduleName} Found</h3>
                    <p>${moduleData.length === 0 ? `Create your first ${config.moduleName.toLowerCase()} to get started.` : 'No items match your search criteria.'}</p>
                    ${moduleData.length === 0 ? `
                        <button class="btn-primary" onclick="${config.createFunction}()" style="margin-top: 1rem;">
                            <span class="btn-icon">➕</span>
                            Create First ${config.moduleName}
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        const dataHtml = filteredData.map(item => config.renderCard(item)).join('');
        container.innerHTML = dataHtml;
    }

    // Filter data
    function filterData(config) {
        const searchTerm = document.getElementById(config.searchId).value.toLowerCase();
        const statusFilter = document.getElementById(config.statusFilterId).value;

        filteredData = moduleData.filter(item => {
            const matchesSearch = config.searchFields.some(field => 
                item[field] && item[field].toString().toLowerCase().includes(searchTerm)
            );
            const matchesStatus = !statusFilter || item.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        renderData(config);
    }

    // Sort data
    function sortData(config) {
        const sortBy = document.getElementById(config.sortId).value;
        currentSort = sortBy;

        filteredData.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return (a.name || a.title || '').localeCompare(b.name || b.title || '');
                case 'date':
                    return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
                case 'amount':
                    return (b.amount || 0) - (a.amount || 0);
                default:
                    return 0;
            }
        });

        renderData(config);
    }

    // Update sort select to reflect current sort
    function updateSortSelect(config) {
        const sortSelect = document.getElementById(config.sortId);
        if (sortSelect) {
            sortSelect.value = currentSort;
        }
    }

    // Show error state
    function showErrorState(message, config) {
        const container = document.getElementById(config.gridId);
        if (container) {
            container.innerHTML = `
                <div class="no-data-message">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="loadData(${JSON.stringify(config)})" style="margin-top: 1rem;">
                        <span class="btn-icon">🔄</span>
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // Handle form submission
    async function handleFormSubmit(event, config) {
        event.preventDefault();
        
        const form = event.target;
        const itemId = form.getAttribute('data-item-id');
        
        // Check if this is an edit operation
        if (itemId) {
            await handleEditSubmit(event, config, itemId);
            return;
        }
        
        const formData = config.getFormData(form);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(config.apiEndpoint, {
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
            showNotification(`${config.moduleName} created successfully!`, 'success');
            closeModal(config.modalId);
            loadData(config); // Refresh the list

        } catch (error) {
            console.error(`Error creating ${config.moduleName}:`, error);
            showNotification(`Failed to create ${config.moduleName}. Please try again.`, 'error');
        }
    }

    // Handle edit submission
    async function handleEditSubmit(event, config, itemId) {
        event.preventDefault();
        
        const form = event.target;
        const formData = config.getFormData(form);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${config.apiEndpoint}/${itemId}`, {
                method: 'PUT',
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
            showNotification(`${config.moduleName} updated successfully!`, 'success');
            closeModal(config.modalId);
            loadData(config);
            
        } catch (error) {
            console.error(`Error updating ${config.moduleName}:`, error);
            showNotification(`Failed to update ${config.moduleName}. Please try again.`, 'error');
        }
    }

    // Utility functions
    function formatCurrency(amount) {
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

    // Modal functions
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const form = modal.querySelector('form');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (form) {
            form.reset();
            form.removeAttribute('data-item-id');
        }
    }

    // Notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Expose functions globally
    window.ModuleTemplate = {
        initializeModule,
        loadData,
        renderData,
        filterData,
        sortData,
        formatCurrency,
        formatDate,
        openModal,
        closeModal,
        showNotification
    };

})();


