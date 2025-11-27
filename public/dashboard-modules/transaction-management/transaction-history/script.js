// Transaction History - Live from DB
(function() {
  'use strict';

  let transactions = [];
  let currentPage = 1;
  const pageSize = 20;
  let totalPages = 1;
  let refreshTimer;

  function init() {
    bindStaticHandlers();
    loadPage();
    startAutoRefresh();
    loadSummaryPanel();
  }

  function bindStaticHandlers() {
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadPage);
    const recvBtn = document.getElementById('receive-payment-btn');
    if (recvBtn) recvBtn.addEventListener('click', goToReceivePayment);
    const prevBtn = document.getElementById('prev-page');
    if (prevBtn) prevBtn.addEventListener('click', previousPage);
    const nextBtn = document.getElementById('next-page');
    if (nextBtn) nextBtn.addEventListener('click', nextPage);

    // Input changes trigger fetch with page reset
    ['type-filter','start-date','end-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { currentPage = 1; loadPage(); });
    });
    const search = document.getElementById('search-input');
    if (search) search.addEventListener('input', debounce(() => { render(); }, 300));
  }

  function debounce(fn, wait) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  async function apiCall(endpoint, options = {}) {
    if (window.apiUtils?.apiCall) return window.apiUtils.apiCall(endpoint, options);
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required.');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers||{}) };
    const res = await fetch(endpoint, { ...options, headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadPage() {
    try {
      showLoading();
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));
      const type = document.getElementById('type-filter')?.value || '';
      const start = document.getElementById('start-date')?.value || '';
      const end = document.getElementById('end-date')?.value || '';
      if (type) params.set('type', type);
      if (start && end) { params.set('startDate', start); params.set('endDate', end); }

      const data = await apiCall(`/transactions/history?${params.toString()}`);
      transactions = data.transactions || [];
      totalPages = data.pagination?.pages || 1;
      render();
      updatePagination();
    } catch (e) {
      showError(e?.message || 'Failed to load');
    }
  }

  function showLoading() {
    const stats = document.getElementById('transactions-stats');
    const list = document.getElementById('transactions-list');
    if (stats) stats.innerHTML = '<div class="loading-message">Loading stats…</div>';
    if (list) list.innerHTML = '<div class="loading-message">Loading transactions…</div>';
  }
  function showError(msg) {
    const list = document.getElementById('transactions-list');
    if (list) list.innerHTML = `<div class="error-message">${msg}</div>`;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',minimumFractionDigits:0,maximumFractionDigits:0}).format(parseFloat(amount)||0);
  }
  function formatDate(d) {
    try { return new Date(d).toLocaleDateString('en-KE',{year:'numeric',month:'short',day:'numeric'}); } catch { return 'N/A'; }
  }

  function render() {
    updateStats();
    const container = document.getElementById('transactions-list');
    if (!container) return;
    let rows = [...transactions];
    const q = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (q) {
      rows = rows.filter(t => `${t.description||''} ${t.payer_name||''} ${t.debtor_name||''} ${t.reference_number||''} ${(t.amount||0)}`.toLowerCase().includes(q));
    }
    if (rows.length === 0) {
      container.innerHTML = `<div class="no-data-message"><h3>No Transactions Found</h3><p>Try changing filters.</p></div>`;
      return;
    }
    container.innerHTML = `
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(t => `
            <tr>
              <td>
                <div class="transaction-info">
                  <div class="transaction-description">${t.description || 'No description'}</div>
                  <div class="transaction-details">${t.payer_name || t.debtor_name || 'Unknown'}${t.reference_number ? ` • Ref: ${t.reference_number}` : ''}</div>
                </div>
              </td>
              <td><span class="transaction-type ${t.type}">${t.type}</span></td>
              <td><div class="transaction-amount">${formatCurrency(t.amount||0)}</div></td>
              <td><span class="transaction-status ${t.status}">${t.status || 'completed'}</span></td>
              <td><div class="transaction-date">${t.transaction_date ? formatDate(t.transaction_date) : 'N/A'}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function updateStats() {
    const stats = document.getElementById('transactions-stats');
    if (!stats) return;
    const total = transactions.length;
    const amount = transactions.reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
    const completed = transactions.filter(t=>t.status==='completed').length;
    const pending = transactions.filter(t=>t.status==='pending').length;
    stats.innerHTML = `
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-value">${formatCurrency(amount)}</div><div class="stat-label">Amount</div></div>
      <div class="stat-card"><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div>
    `;
  }

  function updatePagination() {
    const pag = document.getElementById('pagination');
    const info = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (!pag || !info) return;
    if (totalPages <= 1) { pag.style.display='none'; return; }
    pag.style.display='flex';
    info.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  function previousPage(){ if (currentPage>1){ currentPage--; loadPage(); } }
  function nextPage(){ if (currentPage<totalPages){ currentPage++; loadPage(); } }
  function clearFilters(){
    const ids=['search-input','type-filter','start-date','end-date'];
    ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    currentPage=1; loadPage();
  }
  function goToReceivePayment(){
    try {
      if (window.dashboardController?.loadModule) {
        window.dashboardController.loadModule('transaction-management/receive-payment');
        window.dashboardController.setActiveNavLinkByModule('transaction-management/receive-payment');
      } else {
        window.location.href = '/dashboard/transaction-management/receive-payment';
      }
    } catch (_) { window.location.href = '/dashboard/transaction-management/receive-payment'; }
  }

  function startAutoRefresh(){
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => { loadPage(); loadSummaryPanel(); }, 10000);
  }



  async function loadSummaryPanel() {
    try {
      const panel = document.getElementById('summary-panel');
      if (panel) panel.innerHTML = `
        <div class="stat-card"><div class="stat-value">…</div><div class="stat-label">Pending Tx</div></div>
        <div class="stat-card"><div class="stat-value">…</div><div class="stat-label">Credits (Avail)</div></div>
        <div class="stat-card"><div class="stat-value">…</div><div class="stat-label">Payments In (30d)</div></div>
        <div class="stat-card"><div class="stat-value">…</div><div class="stat-label">Payments Out (30d)</div></div>`;

      const [pending, creditSummary, paymentsIn, paymentsOut] = await Promise.all([
        apiCall('/transactions/pending/list'),
        apiCall('/credits/summary').catch(()=>({ totalCreditLimit:0, availableCredit:0 })),
        apiCall('/transactions/history?type=payment_received&page=1&limit=100').catch(()=>({ transactions:[] })),
        apiCall('/transactions/history?type=payment_made&page=1&limit=100').catch(()=>({ transactions:[] }))
      ]);

      const pendingCount = Array.isArray(pending) ? pending.length : 0;
      const creditsAvail = creditSummary?.availableCredit ?? 0;
      const totalPaymentsIn = (paymentsIn.transactions||[]).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
      const totalPaymentsOut = (paymentsOut.transactions||[]).reduce((s,t)=>s+(parseFloat(t.amount)||0),0);

      if (panel) panel.innerHTML = `
        <div class="stat-card"><div class="stat-value">${pendingCount}</div><div class="stat-label">Pending Tx</div></div>
        <div class="stat-card"><div class="stat-value">${formatCurrency(creditsAvail)}</div><div class="stat-label">Credits (Avail)</div></div>
        <div class="stat-card"><div class="stat-value">${formatCurrency(totalPaymentsIn)}</div><div class="stat-label">Payments In (30d)</div></div>
        <div class="stat-card"><div class="stat-value">${formatCurrency(totalPaymentsOut)}</div><div class="stat-label">Payments Out (30d)</div></div>`;
    } catch (e) {
      const panel = document.getElementById('summary-panel');
      if (panel) panel.innerHTML = `<div class="error-message">Failed to load summary: ${e?.message || ''}</div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();


