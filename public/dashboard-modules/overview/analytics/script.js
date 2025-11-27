// Analytics Module Script
(function() {
  'use strict';
  
  // Auto-refresh interval in milliseconds
  const REFRESH_INTERVAL_MS = 10000; // 10 seconds
  let refreshTimer = null;
  let isAnalyticsLoading = false;

  // Keep last loaded analytics so detail modals can show real data
  const analyticsState = {
    performance: {},
    debtByCategory: [],
    creditByCategory: [],
    recentTransactions: []
  };

  // Helper: get token from localStorage or URL query fallback
  function getAuthToken() {
    const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (localToken && typeof localToken === 'string' && localToken.length > 0) {
      return localToken;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const qsToken = params.get('token');
      if (qsToken && qsToken.length > 0) {
        localStorage.setItem('token', qsToken);
        return qsToken;
      }
    } catch {}
    return null;
  }

  // Helper to fetch JSON with auth token
  async function fetchJson(path) {
    const token = getAuthToken();
    const res = await fetch(path, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Analytics module loaded and DOM ready');
    loadAnalyticsData();
    initializeInteractivity();
    startAutoRefresh();
  });
  
  // Also initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    console.log('Analytics module loaded, waiting for DOM');
  } else {
    console.log('Analytics module loaded, DOM already ready');
    loadAnalyticsData();
    initializeInteractivity();
    startAutoRefresh();
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (!document.hidden) {
        loadAnalyticsData();
      }
    }, REFRESH_INTERVAL_MS);

    // Refresh when tab gains focus or becomes visible
    window.addEventListener('focus', handleVisibilityRefresh, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityRefresh, { passive: true });
    window.addEventListener('beforeunload', stopAutoRefresh, { passive: true });
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    window.removeEventListener('focus', handleVisibilityRefresh);
    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    window.removeEventListener('beforeunload', stopAutoRefresh);
  }

  function handleVisibilityRefresh() {
    if (!document.hidden) {
      loadAnalyticsData();
    }
  }

  async function loadAnalyticsData() {
    if (isAnalyticsLoading) return;
    isAnalyticsLoading = true;
    try {
      console.log('Loading analytics data...');
      showLoadingState();

      const token = getAuthToken();
      if (!token) throw new Error('No authentication token found');

      // 1) Try primary analytics endpoint
      let performance = {};
      let debtByCategory = [];
      let creditByCategory = [];
      let recentTransactions = [];

      try {
        const data = await fetchJson(`/api/dashboard/analytics`);
        // Normalize known shapes
        const perf = data.performance || data.metrics || data || {};
        performance.activeDebts = perf.activeDebts ?? perf.active_debts ?? perf.debt_count ?? performance.activeDebts;
        performance.totalOutstanding = perf.totalOutstanding ?? perf.total_outstanding ?? perf.outstanding_debts ?? performance.totalOutstanding;
        performance.totalCollected = perf.totalCollected ?? perf.total_collected ?? perf.payments_total ?? performance.totalCollected;
        performance.collectionRate = perf.collectionRate ?? perf.collection_rate ?? performance.collectionRate;
        debtByCategory = data.debtByCategory || data.debt_by_category || debtByCategory;
        creditByCategory = data.creditByCategory || data.credit_by_category || creditByCategory;
        recentTransactions = data.recentTransactions || data.recent_activity || recentTransactions;
      } catch (e) {
        console.warn('Primary analytics endpoint failed, falling back to summaries:', e.message);
      }

      // 2) Fallback to dedicated summaries used by forms (if available)
      // Debts summary
      try {
        const debtsSummary = await fetchJson(`/api/debts/summary`);
        performance.activeDebts = (debtsSummary.activeDebts ?? debtsSummary.active_debts ?? debtsSummary.debt_count ?? performance.activeDebts);
        performance.totalOutstanding = (debtsSummary.totalOutstanding ?? debtsSummary.total_outstanding ?? debtsSummary.outstanding_debts ?? performance.totalOutstanding);
        if ((!debtByCategory?.length) && (debtsSummary.byCategory || debtsSummary.by_category)) {
          debtByCategory = debtsSummary.byCategory || debtsSummary.by_category;
        }
      } catch {}

      // Transactions fallback
      try {
        const txRes = await fetch(`/api/transactions?limit=500`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (txRes.ok) {
          const txData = await txRes.json();
          recentTransactions = Array.isArray(txData.transactions) ? txData.transactions : [];
        }
      } catch (e) { console.warn('Transactions fetch fallback failed:', e.message); }

      if (!creditByCategory.length && recentTransactions.length) {
        creditByCategory = computeCreditCategoriesFromTransactions(recentTransactions);
      }

      // Compute collection rate if missing
      if (performance && (performance.collectionRate == null)) {
        const collected = Number(performance.totalCollected || 0);
        const outstanding = Number(performance.totalOutstanding || 0);
        const denom = collected + outstanding;
        performance.collectionRate = denom > 0 ? Math.round((collected / denom) * 100) : 0;
      }

      // Update UI
      updateAnalyticsCards(performance || {});
      updateDebtCategories(debtByCategory || []);
      updateDebtCategoriesChart(debtByCategory || []);
      updateCreditCategories(creditByCategory || []);
      if (recentTransactions.length) {
        updateRecentActivityFromTransactions(recentTransactions);
      } else {
        document.getElementById('recent-activity').innerHTML = '<div class="no-data-message">No recent activity</div>';
      }

      // Save for modal details
      analyticsState.performance = performance || {};
      analyticsState.debtByCategory = debtByCategory || [];
      analyticsState.creditByCategory = creditByCategory || [];
      analyticsState.recentTransactions = recentTransactions || [];

    } catch (error) {
      console.error('Error loading analytics:', error);
      showErrorState('Failed to load analytics data');
    } finally {
      isAnalyticsLoading = false;
    }
  }

  function showLoadingState() {
    document.getElementById('debt-categories').innerHTML = '<div class="loading-message">Loading categories...</div>';
    document.getElementById('recent-activity').innerHTML = '<div class="loading-message">Loading recent activity...</div>';
  }
  
  function showErrorState(message) {
    document.getElementById('debt-categories').innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('recent-activity').innerHTML = `<div class="error-message">${message}</div>`;
  }
  
  function updateAnalyticsCards(performance) {
    // Normalize keys from snake_case or alternate names
    const toNumber = (v) => {
      const n = typeof v === 'string' ? parseFloat(v.replace(/[,Ksh\s]/g, '')) : Number(v);
      return isFinite(n) ? n : 0;
    };
    const totalDebts = toNumber(performance.activeDebts ?? performance.active_debts ?? performance.debt_count ?? 0);
    const totalAmountRaw = performance.totalOutstanding ?? performance.total_outstanding ?? performance.outstanding_debts ?? performance.total_debts ?? 0;
    const totalPaymentsRaw = performance.totalCollected ?? performance.total_collected ?? performance.payments_total ?? performance.total_payments ?? 0;
    const totalAmount = toNumber(totalAmountRaw);
    const totalPayments = toNumber(totalPaymentsRaw);
    let collectionRate = performance.collectionRate ?? performance.collection_rate;
    if (collectionRate == null) {
      const denom = totalPayments + totalAmount;
      collectionRate = denom > 0 ? ((totalPayments / denom) * 100) : 0;
    }
    collectionRate = Number(collectionRate);
    
    const debtsEl = document.getElementById('total-debts');
    const amountEl = document.getElementById('total-amount');
    const paymentsEl = document.getElementById('total-payments');
    const rateEl = document.getElementById('collection-rate');
    if (debtsEl) debtsEl.textContent = totalDebts;
    if (amountEl) amountEl.textContent = formatCurrency(totalAmount);
    if (paymentsEl) paymentsEl.textContent = formatCurrency(totalPayments);
    if (rateEl) rateEl.textContent = `${collectionRate.toFixed(2)}%`;
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  function updateDebtCategories(categories) {
    const container = document.getElementById('debt-categories');
    
    if (categories.length === 0) {
      container.innerHTML = '<div class="no-data-message">No category data available</div>';
      return;
    }
    
    // Calculate total amount for percentage calculation
    const totalAmount = categories.reduce((sum, cat) => sum + parseFloat(cat.total_amount || 0), 0);
    
    container.innerHTML = categories.map(cat => {
      const amount = cat.total_amount || 0;
      const count = cat.count || 0;
      const categoryName = cat.category || 'Uncategorized';
      
      return `
        <div class="category-item">
          <div class="category-info">
            <div class="category-name">${categoryName}</div>
            <div class="category-count">${count} debts</div>
          </div>
          <div class="category-amount">${formatCurrency(amount)}</div>
        </div>
      `;
    }).join('');
  }

  function updateDebtCategoriesChart(categories) {
    const chartEl = document.getElementById('categories-chart');
    if (!chartEl) return;
    
    if (!Array.isArray(categories) || categories.length === 0) {
      chartEl.innerHTML = '<div class="no-data-message">No chart data available</div>';
      return;
    }
    
    const total = categories.reduce((sum, cat) => sum + parseFloat(cat.total_amount || 0), 0);
    const colors = ['#28a745', '#20c997', '#17a2b8', '#ffc107', '#6f42c1', '#fd7e14', '#e83e8c', '#6610f2'];
    let angle = 0;
    const segments = categories.map((cat, idx) => {
      const value = parseFloat(cat.total_amount || 0);
      const pct = total > 0 ? (value / total) * 100 : 0;
      const start = angle;
      const end = angle + pct;
      angle = end;
      return {
        start,
        end,
        color: colors[idx % colors.length],
        pct,
        label: cat.category || 'Uncategorized'
      };
    });
    
    // Build conic-gradient stops
    const gradientStops = segments.map(seg => {
      const start = `${seg.start.toFixed(2)}%`;
      const end = `${seg.end.toFixed(2)}%`;
      return `${seg.color} ${start} ${end}`;
    }).join(', ');
    
    const pieHtml = `<div class="pie-chart" style="background: conic-gradient(${gradientStops});"></div>`;
    const legendItems = segments.map(seg => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${seg.color};"></span>
        <span>${seg.label} (${Math.round(seg.pct)}%)</span>
      </div>
    `).join('');
    
    chartEl.innerHTML = `${pieHtml}<div class="legend">${legendItems}</div>`;
  }

  function updateCreditCategories(categories) {
    const container = document.getElementById('credit-categories');
    
    if (categories.length === 0) {
      container.innerHTML = '<div class="no-data-message">No credit category data available</div>';
      return;
    }
    
    // Calculate total amount for percentage calculation
    const totalAmount = categories.reduce((sum, cat) => sum + parseFloat(cat.total_amount || 0), 0);
    
    container.innerHTML = categories.map(cat => {
      const amount = cat.total_amount || 0;
      const count = cat.count || 0;
      const categoryName = cat.category || 'Uncategorized';
      
      return `
        <div class="category-item">
          <div class="category-info">
            <div class="category-name">${categoryName}</div>
            <div class="category-count">${count} payments</div>
          </div>
          <div class="category-amount">${formatCurrency(amount)}</div>
        </div>
      `;
    }).join('');
  }

  // Removed updateRecentActivity and computeTrendsFromTransactions

  function updateRecentActivityFromTransactions(transactions = []) {
    const container = document.getElementById('recent-activity');
    if (!transactions.length) {
      container.innerHTML = '<div class="no-data-message">No recent activity</div>';
      return;
    }
    const recent = transactions
      .sort((a, b) => new Date(b.transaction_date || b.created_at || 0) - new Date(a.transaction_date || a.created_at || 0))
      .slice(0, 5);
    container.innerHTML = recent.map(t => `
      <div class="activity-item">
        <div class="activity-icon">💸</div>
        <div class="activity-content">
          <div class="activity-description">${(t.count || 1) > 1 ? `${t.count} payments received` : 'Payment received'}</div>
          <div class="activity-time">${getTimeAgo(t.transaction_date || t.created_at)}</div>
        </div>
        <div class="activity-amount">${formatCurrency(t.amount || t.total_amount || 0)}</div>
      </div>
    `).join('');
  }
  
  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }
  
  function getTransactionIcon(type) {
    const icons = {
      'payment_received': '💰',
      'payment_made': '💳',
      'debt_created': '📝',
      'credit_created': '📊',
      'refund': '↩️',
      'adjustment': '⚖️'
    };
    return icons[type] || '📋';
  }
  
  function getTransactionDescription(transaction) {
    const descriptions = {
      'payment_received': `Payment received from ${transaction.payer_name || 'Unknown'}`,
      'payment_made': `Payment made to ${transaction.payer_name || 'Unknown'}`,
      'debt_created': `New debt recorded for ${transaction.payer_name || 'Unknown'}`,
      'credit_created': `Credit created for ${transaction.payer_name || 'Unknown'}`,
      'refund': `Refund processed for ${transaction.payer_name || 'Unknown'}`,
      'adjustment': `Adjustment made for ${transaction.payer_name || 'Unknown'}`
    };
    return descriptions[transaction.type] || 'Transaction processed';
  }
  
  // Export functions for external use
  window.analyticsModule = {
    loadData: loadAnalyticsData,
    refresh: loadAnalyticsData,
    initializeInteractivity: initializeInteractivity
  };
  
})();

function initializeInteractivity() {
  // No interactive controls currently
}
