// Credit Reports - Fresh Implementation
(function() {
  'use strict';
  
  let allCredits = [];
  let filteredCredits = [];
  let currentTab = 'summary';
  let isLoading = false;
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  async function loadData() {
    if (isLoading) return;
    isLoading = true;
    
    const statsEl = document.getElementById('reports-stats');
    const bodyEl = document.getElementById('reports-body');
    
    if (statsEl) statsEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">Loading...</div>';
    if (bodyEl) bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">Loading...</div>';
    
    const timeout = setTimeout(() => {
      isLoading = false;
      if (statsEl) statsEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">⚠️ Timeout - Please refresh</div>';
      if (bodyEl) bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">⚠️ Timeout - Please refresh</div>';
    }, 3000);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      // Fetch credits and recent transactions concurrently so reports reflect actual transaction history
      const [creditsResp, txResp] = await Promise.all([
        fetch('/api/credits', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/credits/transactions/recent?limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      clearTimeout(timeout);
      
      if (!creditsResp.ok) throw new Error('Failed to load credits');
      if (!txResp.ok) throw new Error('Failed to load transactions');
      
      const creditsData = await creditsResp.json();
      const txData = await txResp.json();
      
      // Normalize credits list shape
      allCredits = creditsData.credits || creditsData || [];
      const transactions = Array.isArray(txData) ? txData : [];

      // Build used-credit map from transactions: withdrawals add, payments subtract
      const usedByAccount = transactions.reduce((acc, tx) => {
        const key = tx.credit_account_id;
        if (!key && key !== 0) return acc;
        const amt = parseFloat(tx.amount) || 0;
        const delta = tx.transaction_type === 'payment' ? -amt : amt; // payment reduces used credit
        acc[key] = (acc[key] || 0) + delta;
        return acc;
      }, {});

      // Enrich credits with transaction-derived usage so reports reflect transactions
      filteredCredits = (allCredits || []).map(c => {
        const id = c.id || c.credit_account_id || c.account_id;
        const derivedUsed = usedByAccount[id] ?? 0;
        const limit = parseFloat(c.credit_limit) || 0;
        const amount = derivedUsed; // override with transaction-derived used amount
        const available = limit - amount;
        return {
          ...c,
          amount,
          available_credit: available,
          utilization_percentage: limit > 0 ? Math.round((amount / limit) * 100) : 0
        };
      });
      
      updateStats();
      renderContent();
      isLoading = false;
    } catch (error) {
      clearTimeout(timeout);
      isLoading = false;
      if (statsEl) statsEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">⚠️ Error loading data</div>';
      if (bodyEl) bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #fff;">⚠️ Error loading data</div>';
      console.error('[Credit Reports] Load error:', error);
    }
  }

  function updateStats() {
    const statsEl = document.getElementById('reports-stats');
    if (!statsEl) return;
    
    const total = filteredCredits.length;
    const totalAmount = filteredCredits.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalLimit = filteredCredits.reduce((sum, c) => sum + (parseFloat(c.credit_limit) || 0), 0);
    const available = totalLimit - totalAmount;
    
    statsEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #fff; margin-bottom: 0.25rem;">${total}</div>
          <div style="color: #ccc;">Total Credits</div>
        </div>
        <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">💰</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #fff; margin-bottom: 0.25rem;">${formatCurrency(totalAmount)}</div>
          <div style="color: #ccc;">Total Used (from transactions)</div>
        </div>
        <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">💳</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: #fff; margin-bottom: 0.25rem;">${formatCurrency(totalLimit)}</div>
          <div style="color: #ccc;">Total Limit</div>
        </div>
        <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">💵</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: ${available >= 0 ? '#51cf66' : '#ff6b6b'}; margin-bottom: 0.25rem;">${formatCurrency(available)}</div>
          <div style="color: #ccc;">Available (limit - used)</div>
        </div>
      </div>
    `;
  }

  function renderContent() {
    const bodyEl = document.getElementById('reports-body');
    if (!bodyEl) return;
    
    if (filteredCredits.length === 0) {
      bodyEl.innerHTML = '<div style="text-align: center; padding: 3rem; color: #fff;">No credit data available</div>';
      return;
    }
    
    switch (currentTab) {
      case 'summary': renderSummary(bodyEl); break;
      case 'trends': renderTrends(bodyEl); break;
      case 'breakdown': renderBreakdown(bodyEl); break;
      case 'monthly': renderMonthly(bodyEl); break;
      default: renderSummary(bodyEl);
    }
  }

  function renderSummary(bodyEl) {
    bodyEl.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; color: #fff;">
          <thead>
            <tr style="background: #2a2a2a; border-bottom: 2px solid #fff;">
              <th style="padding: 1rem; text-align: left;">Account</th>
              <th style="padding: 1rem; text-align: left;">Used (tx)</th>
              <th style="padding: 1rem; text-align: left;">Limit</th>
              <th style="padding: 1rem; text-align: left;">Available</th>
              <th style="padding: 1rem; text-align: left;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCredits.map((c, i) => {
              const amount = parseFloat(c.amount) || 0;
              const limit = parseFloat(c.credit_limit) || 0;
              const available = limit - amount;
              return `
                <tr style="border-bottom: 1px solid #333; ${i % 2 === 0 ? 'background: #1a1a1a;' : 'background: #222;'}">
                  <td style="padding: 1rem;">${c.account_name || c.creditor_name || c.name || 'N/A'}</td>
                  <td style="padding: 1rem;">${formatCurrency(amount)}</td>
                  <td style="padding: 1rem;">${formatCurrency(limit)}</td>
                  <td style="padding: 1rem; color: ${available >= 0 ? '#51cf66' : '#ff6b6b'};">${formatCurrency(available)}</td>
                  <td style="padding: 1rem;">${c.type || c.category || 'N/A'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTrends(bodyEl) {
    const monthly = {};
    filteredCredits.forEach(c => {
      const date = new Date(c.created_at || c.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthly[key]) monthly[key] = { month: name, count: 0, total: 0 };
      monthly[key].count++;
      monthly[key].total += parseFloat(c.amount) || 0;
    });
    
    const sorted = Object.keys(monthly).sort().reverse();
    const max = Math.max(...sorted.map(k => monthly[k].total), 1);
    
    bodyEl.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 2rem;">
        <h3 style="color: #fff; margin-bottom: 2rem;">📈 Monthly Trends</h3>
        ${sorted.map(key => {
          const d = monthly[key];
          const pct = (d.total / max) * 100;
          return `
            <div style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: #fff;">
                <span style="font-weight: bold;">${d.month}</span>
                <span>${formatCurrency(d.total)} (${d.count} accounts)</span>
              </div>
              <div style="background: #2a2a2a; border: 1px solid #fff; border-radius: 4px; height: 30px; position: relative;">
                <div style="background: #fff; height: 100%; width: ${pct}%;"></div>
                <div style="position: absolute; top: 50%; left: 10px; transform: translateY(-50%); color: #000; font-weight: bold;">${d.count}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderBreakdown(bodyEl) {
    const types = {};
    filteredCredits.forEach(c => {
      const type = c.type || c.category || 'other';
      if (!types[type]) types[type] = { count: 0, total: 0 };
      types[type].count++;
      types[type].total += parseFloat(c.amount) || 0;
    });
    
    const total = Object.values(types).reduce((sum, t) => sum + t.total, 0);
    
    bodyEl.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 2rem;">
        <h3 style="color: #fff; margin-bottom: 2rem;">📊 Type Breakdown</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
          ${Object.entries(types).map(([type, data]) => {
            const pct = total > 0 ? (data.total / total) * 100 : 0;
            return `
              <div style="background: #2a2a2a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                  <h4 style="color: #fff; text-transform: capitalize; margin: 0;">${type}</h4>
                  <span style="color: #fff; font-weight: bold;">${data.count}</span>
                </div>
                <div style="color: #fff; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">${formatCurrency(data.total)}</div>
                <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 4px; height: 20px; margin-bottom: 0.5rem;">
                  <div style="background: #fff; height: 100%; width: ${pct}%;"></div>
                </div>
                <div style="color: #ccc; font-size: 0.9rem;">${pct.toFixed(1)}% of total</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderMonthly(bodyEl) {
    const monthly = {};
    filteredCredits.forEach(c => {
      const date = new Date(c.created_at || c.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthly[key]) monthly[key] = { month: name, credits: [], count: 0, total: 0, limit: 0 };
      monthly[key].credits.push(c);
      monthly[key].count++;
      monthly[key].total += parseFloat(c.amount) || 0;
      monthly[key].limit += parseFloat(c.credit_limit) || 0;
    });
    
    const sorted = Object.keys(monthly).sort().reverse();
    
    bodyEl.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 2rem;">
        <h3 style="color: #fff; margin-bottom: 2rem;">📅 Monthly View</h3>
        ${sorted.map(key => {
          const d = monthly[key];
          const available = d.limit - d.total;
          return `
            <div style="background: #2a2a2a; border: 1px solid #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #fff; padding-bottom: 1rem;">
                <h4 style="color: #fff; margin: 0;">${d.month}</h4>
                <span style="color: #fff; font-weight: bold;">${d.count} accounts</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1rem; text-align: center;">
                  <div style="font-weight: bold; color: #fff;">Total Used</div>
                  <div style="font-size: 1.2rem; color: #fff;">${formatCurrency(d.total)}</div>
                </div>
                <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1rem; text-align: center;">
                  <div style="font-weight: bold; color: #fff;">Total Limit</div>
                  <div style="font-size: 1.2rem; color: #fff;">${formatCurrency(d.limit)}</div>
                </div>
                <div style="background: #1a1a1a; border: 1px solid #fff; border-radius: 8px; padding: 1rem; text-align: center;">
                  <div style="font-weight: bold; color: ${available >= 0 ? '#51cf66' : '#ff6b6b'};">Available</div>
                  <div style="font-size: 1.2rem; color: ${available >= 0 ? '#51cf66' : '#ff6b6b'};">${formatCurrency(available)}</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Expose refresh function for external triggers
  window.creditReportsModule = {
    refresh: loadData
  };

  // Initialize immediately if DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadData();
  } else {
    document.addEventListener('DOMContentLoaded', loadData);
  }

  // Tab switching handlers
  window.switchTab = function(tab) {
    currentTab = tab;
    renderContent();
  };

  window.refreshReports = function() {
    loadData();
  };

  window.exportReport = function() {
    // Simple CSV export of summary table using transaction-derived values
    const rows = filteredCredits.map(c => {
      const amount = parseFloat(c.amount) || 0;
      const limit = parseFloat(c.credit_limit) || 0;
      const available = limit - amount;
      return [
        (c.account_name || c.creditor_name || c.name || 'N/A'),
        amount,
        limit,
        available,
        (c.type || c.category || 'N/A')
      ];
    });
    const header = ['Account','Used (tx)','Limit','Available','Type'];
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `credit-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  window.printReport = function() {
    window.print();
  };

})();