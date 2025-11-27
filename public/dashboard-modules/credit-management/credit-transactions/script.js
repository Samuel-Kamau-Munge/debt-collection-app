// Credit Transactions - Fresh Implementation
(function() {
  'use strict';

  let transactions = [];
  let filteredTransactions = [];
  let accounts = [];
  let isLoading = false;

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function loadAccounts() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/credits/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) {
          showNotification('Authentication required. Please log in again.', 'error');
        } else if (err && err.error) {
          showNotification(err.error, 'error');
        }
        return;
      }
      
      const data = await response.json();
      accounts = Array.isArray(data) ? data : (data.accounts || data.credits || []);
      populateAccountFilter();
      updateSummaryCards();
    } catch (error) {
      console.error('Error loading accounts:', error);
      showNotification('Failed to load accounts. Please try again.', 'error');
    }
  }

  async function loadTransactions() {
    if (isLoading) return;
    isLoading = true;
    
    const tbody = document.getElementById('transactions-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #fff;">Loading...</td></tr>';
    }
    
    const timeout = setTimeout(() => {
      isLoading = false;
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #fff;">⚠️ Timeout - Please refresh</td></tr>';
      }
    }, 3000);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/credits/transactions/recent?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        transactions = Array.isArray(data) ? data : (data.transactions || []);
      } else {
        transactions = [];
      }
      
      filteredTransactions = [...transactions];
      renderTransactions();
      isLoading = false;
    } catch (error) {
      clearTimeout(timeout);
      isLoading = false;
      transactions = [];
      filteredTransactions = [];
      renderTransactions();
    }
  }

  function updateSummaryCards() {
    const totalAccounts = accounts.length;
    const totalUsedCredit = accounts.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalCreditLimit = accounts.reduce((sum, a) => sum + (parseFloat(a.credit_limit) || 0), 0);
    const totalAvailableCredit = totalCreditLimit - totalUsedCredit;

    const totalEl = document.getElementById('total-transactions');
    const withdrawalsEl = document.getElementById('total-withdrawals');
    const paymentsEl = document.getElementById('total-payments');
    const netEl = document.getElementById('net-amount');
    
    if (totalEl) totalEl.textContent = totalAccounts;
    if (withdrawalsEl) withdrawalsEl.textContent = formatCurrency(totalUsedCredit);
    if (paymentsEl) paymentsEl.textContent = formatCurrency(totalAvailableCredit);
    if (netEl) netEl.textContent = formatCurrency(totalCreditLimit);
  }

  function renderTransactions() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) return;

    if (filteredTransactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: #fff;">
            <h3>📊 Transaction Tracking</h3>
            <p>Credit transactions are being processed and will update your credit account balances.</p>
            <p style="margin-top: 1rem; color: #51cf66;">
              <strong>✅ Transactions are working!</strong> Create a transaction to see the balance changes.
            </p>
            <button onclick="createNewTransaction()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #fff; color: #000; border: none; border-radius: 4px; cursor: pointer;">
              ➕ Create Transaction
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredTransactions.map(t => `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 1rem; color: #fff;">${formatDate(t.transaction_date || t.created_at)}</td>
        <td style="padding: 1rem; color: #fff;">${t.account_name || 'Unknown'}</td>
        <td style="padding: 1rem;">
          <span style="padding: 0.25rem 0.5rem; border-radius: 4px; background: #333; color: #fff;">
            ${t.transaction_type || 'N/A'}
          </span>
        </td>
        <td style="padding: 1rem; color: ${t.transaction_type === 'withdrawal' ? '#ff6b6b' : '#51cf66'};">
          ${t.transaction_type === 'withdrawal' ? '-' : '+'}${formatCurrency(t.amount || 0)}
        </td>
        <td style="padding: 1rem; color: #fff;">${t.description || '-'}</td>
        <td style="padding: 1rem;">
          <span style="padding: 0.25rem 0.5rem; border-radius: 4px; background: #333; color: #fff;">
            ${t.status || 'completed'}
          </span>
        </td>
        <td style="padding: 1rem;">
          <button onclick="viewTransaction('${t.id}')" style="padding: 0.25rem 0.5rem; background: #fff; color: #000; border: none; border-radius: 4px; cursor: pointer;">View</button>
        </td>
      </tr>
    `).join('');
  }

  function populateAccountFilter() {
    const accountFilter = document.getElementById('account-filter');
    const creditAccountSelect = document.getElementById('credit-account');
    
    if (accountFilter) {
      accountFilter.innerHTML = '<option value="">All Accounts</option>' +
        (Array.isArray(accounts) ? accounts.map(a => `<option value="${a.id}">${a.account_name || a.creditor_name || a.name || ('Account ' + a.id)}</option>`).join('') : '');
    }
    
    if (creditAccountSelect) {
      creditAccountSelect.innerHTML = '<option value="">Select Account</option>' +
        (Array.isArray(accounts) ? accounts.map(a => `<option value="${a.id}">${a.account_name || a.creditor_name || a.name || ('Account ' + a.id)}</option>`).join('') : '');
    }
  }

  function filterTransactions() {
    const accountFilter = document.getElementById('account-filter')?.value || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const search = document.getElementById('search-transactions')?.value.toLowerCase() || '';
    
    filteredTransactions = transactions.filter(t => {
      if (accountFilter && t.credit_account_id !== parseInt(accountFilter)) return false;
      if (typeFilter && t.transaction_type !== typeFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const searchStr = `${t.account_name || ''} ${t.description || ''} ${t.transaction_type || ''}`.toLowerCase();
        if (!searchStr.includes(search)) return false;
      }
      return true;
    });
    
    renderTransactions();
  }

  async function handleNewTransactionSubmit(event) {
    event.preventDefault();
    
    const accountEl = document.getElementById('credit-account');
    const typeEl = document.getElementById('transaction-type');
    const amountEl = document.getElementById('transaction-amount');
    const descEl = document.getElementById('transaction-description');

    const credit_account_id = accountEl?.value;
    const transaction_type = typeEl?.value;
    const amount = parseFloat(amountEl?.value);
    const description = descEl?.value || '';

    if (!credit_account_id) {
      showNotification('Please select a credit account.', 'error');
      return;
    }
    if (!transaction_type) {
      showNotification('Please select a transaction type.', 'error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    const formData = {
      credit_account_id: Number(credit_account_id),
      transaction_type,
      amount,
      description
    };

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/credits/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        showNotification(result.error || 'Failed to create transaction. Please try again.', 'error');
        return;
      }

      showNotification('Transaction created successfully!', 'success');

      const tx = result && result.transaction;
      if (!tx) {
        // If server did not return the transaction, force a reload to sync state
        await loadTransactions();
        await loadAccounts();
        closeNewTransactionModal();
        return;
      }

      // Prepend server transaction; keep current filters
      transactions = [tx, ...transactions];
      filterTransactions();

      await loadAccounts();
      closeNewTransactionModal();
    } catch (error) {
      showNotification('Failed to create transaction. Please try again.', 'error');
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#fff'};
      color: ${type === 'info' ? '#000' : '#fff'};
      padding: 1rem 1.5rem;
      border-radius: 8px;
      z-index: 10001;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Global functions
  window.createNewTransaction = function() {
    const modal = document.getElementById('new-transaction-modal');
    if (modal) {
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
      document.getElementById('new-transaction-form')?.reset();
    }
  };

  window.closeNewTransactionModal = function() {
    const modal = document.getElementById('new-transaction-modal');
    if (modal) modal.style.display = 'none';
  };

  window.refreshTransactions = function() {
    loadAccounts();
    loadTransactions().then(() => {
      filterTransactions();
    });
  };

  window.viewTransaction = function(id) {
    // Try to find transaction in memory first
    const tx = transactions.find(t => String(t.id) === String(id));

    // Helper to render modal content
    function renderDetails(transaction) {
      const body = document.getElementById('transaction-details-body');
      const modal = document.getElementById('transaction-details-modal');
      if (!body || !modal) {
        alert('Transaction details UI is not available.');
        return;
      }

      const isWithdrawal = transaction.transaction_type === 'withdrawal';
      const amountColor = isWithdrawal ? '#ff6b6b' : '#51cf66';

      body.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; color:#000;">
          <div>
            <div style="color:#666;">Transaction ID</div>
            <div style="font-weight:bold;">${transaction.id}</div>
          </div>
          <div>
            <div style="color:#666;">Date</div>
            <div style="font-weight:bold;">${formatDate(transaction.transaction_date || transaction.created_at)}</div>
          </div>
          <div>
            <div style="color:#666;">Account</div>
            <div style="font-weight:bold;">${transaction.account_name || 'Unknown'}</div>
          </div>
          <div>
            <div style="color:#666;">Type</div>
            <div style="font-weight:bold;">${transaction.transaction_type}</div>
          </div>
          <div>
            <div style="color:#666;">Amount</div>
            <div style="font-weight:bold; color:${amountColor};">${formatCurrency(transaction.amount || 0)}</div>
          </div>
          <div>
            <div style="color:#666;">Status</div>
            <div style="font-weight:bold;">${transaction.status || 'completed'}</div>
          </div>
          <div style="grid-column:1/-1;">
            <div style="color:#666;">Description</div>
            <div style="font-weight:bold;">${transaction.description || '-'}</div>
          </div>
        </div>
      `;

      // Show modal overlay
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    }

    // If in-memory exists, show details immediately
    if (tx) {
      renderDetails(tx);
      return;
    }

    // Otherwise, attempt to fetch from backend (if supported in the future)
    // Currently there is no GET /api/credits/transactions/:id endpoint, so gracefully fallback
    alert(`Transaction ${id} not found in current view. Try Refresh to reload recent transactions.`);
  };

  window.closeTransactionDetailsModal = function() {
    const modal = document.getElementById('transaction-details-modal');
    if (modal) modal.style.display = 'none';
  };

  window.filterTransactions = filterTransactions;

  window.handleTransactionTypeChange = function() {
    const type = document.getElementById('transaction-type')?.value;
    const amountInput = document.getElementById('transaction-amount');
    if (amountInput) {
      amountInput.placeholder = type === 'withdrawal' ? 'Amount to withdraw' : 'Amount to pay back';
    }
  };

  window.exportTransactions = function() {
    alert('Export functionality coming soon');
  };

  window.printTransactions = function() {
    window.print();
  };

  // Initialize
  function init() {
    const tbody = document.getElementById('transactions-table-body');
    if (!tbody) {
      setTimeout(init, 100);
      return;
    }
    
    document.getElementById('new-transaction-form')?.addEventListener('submit', handleNewTransactionSubmit);
    document.getElementById('search-transactions')?.addEventListener('input', filterTransactions);
    document.getElementById('account-filter')?.addEventListener('change', filterTransactions);
    document.getElementById('type-filter')?.addEventListener('change', filterTransactions);
    document.getElementById('status-filter')?.addEventListener('change', filterTransactions);
    
    loadAccounts();
    loadTransactions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 500);
})();