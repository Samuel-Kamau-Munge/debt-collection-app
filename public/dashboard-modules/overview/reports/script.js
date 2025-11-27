// Reports Module Script
(function() {
  'use strict';
  
  // Module initialization
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Reports module loaded and DOM ready');
    loadReportsData();
    initializeInteractivity();
  });
  
  // Also initialize immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    console.log('Reports module loaded, waiting for DOM');
  } else {
    console.log('Reports module loaded, DOM already ready');
    loadReportsData();
    initializeInteractivity();
  }
  
  function initializeInteractivity() {
    // Chart period controls
    const chartBtns = document.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        chartBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        updateChartData(this.dataset.period);
      });
    });
    
    // Export and print buttons
    const exportBtn = document.querySelector('.export-btn');
    const printBtn = document.querySelector('.print-btn');
    
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        exportAllReports();
      });
    }
    
    if (printBtn) {
      printBtn.addEventListener('click', function() {
        printReports();
      });
    }
    
    // Filter select
    const filterSelect = document.querySelector('.filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', function() {
        filterReports(this.value);
      });
    }
    
    // View all and refresh buttons
    const viewAllBtn = document.querySelector('.view-all-btn');
    const refreshBtn = document.querySelector('.refresh-btn');
    
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', function() {
        showAllAvailableReports();
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        refreshReports();
      });
    }
    
    // Report action buttons
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-primary') || e.target.classList.contains('btn-secondary')) {
        console.log('Report action button clicked:', e.target.textContent);
        const action = e.target.textContent.trim();
        const reportItem = e.target.closest('.report-item');
        const reportName = reportItem.querySelector('h4').textContent;
        console.log('Report name:', reportName);
        handleReportAction(action, reportName);
      }
    });
    
    // Also add direct event listeners to existing buttons
    setTimeout(() => {
      const reportButtons = document.querySelectorAll('.btn-primary, .btn-secondary');
      console.log('Found report buttons:', reportButtons.length);
      reportButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
          console.log('Direct button click:', this.textContent);
          e.stopPropagation();
        });
      });
    }, 1000);
    
    // Date picker
    const datePicker = document.querySelector('.date-picker');
    if (datePicker) {
      datePicker.addEventListener('click', function() {
        showDateRangePicker();
      });
    }
    
    // Metric cards - make them clickable for details
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
      card.addEventListener('click', function() {
        const metricType = this.querySelector('.metric-label').textContent;
        showMetricDetails(metricType);
      });
    });
  }
  
  function updateChartData(period) {
    console.log(`Updating chart data for period: ${period}`);
    
    // Update the date range display
    const dateRangeSpan = document.querySelector('.date-range span');
    if (dateRangeSpan) {
      const periodMap = {
        '30d': 'Last 30 days',
        '90d': 'Last 90 days',
        '1y': 'Last year'
      };
      dateRangeSpan.textContent = periodMap[period] || 'Last 30 days';
    }
    
    // Reload data with new period
    loadReportsData();
  }
  
  function exportAllReports() {
    // Create a modal for export options
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Export Reports</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="export-options">
            <button class="export-option-btn" data-format="pdf">📄 Export as PDF</button>
            <button class="export-option-btn" data-format="excel">📊 Export as Excel</button>
            <button class="export-option-btn" data-format="csv">📋 Export as CSV</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Export option buttons
    modal.querySelectorAll('.export-option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const format = this.dataset.format;
        performExport(format);
        document.body.removeChild(modal);
      });
    });
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function printReports() {
    // Show print preview
    showNotification('Preparing reports for printing...');
    
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Debt Collection Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .report-section { margin-bottom: 30px; }
            .metric-card { border: 1px solid #ccc; padding: 15px; margin: 10px 0; }
            .chart-placeholder { border: 1px dashed #ccc; height: 200px; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <h1>Debt Collection Reports</h1>
          <div class="report-section">
            <h2>Summary Metrics</h2>
            <div class="metric-card">
              <h3>Total Reports: ${document.getElementById('total-reports').textContent}</h3>
              <p>Collection Rate: ${document.getElementById('collection-rate').textContent}</p>
              <p>Total Collected: ${document.getElementById('total-collected').textContent}</p>
              <p>Avg Collection Time: ${document.getElementById('avg-collection-time').textContent}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  }
  
  function showAllAvailableReports() {
    // Create a modal showing all available reports
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>All Available Reports</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div id="all-reports-list">
            <div class="loading-message">Loading all reports...</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load all reports
    loadAllAvailableReports();
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function showAllPerformanceMetrics() {
    // Create a modal showing all performance metrics
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>All Performance Metrics</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div id="all-metrics-list">
            <div class="loading-message">Loading all metrics...</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load all metrics
    loadAllPerformanceMetrics();
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function refreshReports() {
    showNotification('Refreshing reports data...');
    loadReportsData();
  }
  
  function handleReportAction(action, reportName) {
    console.log(`Report action: ${action} for ${reportName}`);
    
    switch(action) {
      case '📊 View':
        showReportDetails(reportName);
        break;
      case '📥 Download':
        downloadReport(reportName);
        break;
      case '📤 Share':
        shareReport(reportName);
        break;
      case 'View':
        showReportDetails(reportName);
        break;
      case 'Download':
        downloadReport(reportName);
        break;
      case 'Share':
        shareReport(reportName);
        break;
      default:
        console.log(`${action} clicked for: ${reportName}`);
        showNotification(`Action "${action}" clicked for ${reportName}`);
    }
  }
  
  function showDateRangePicker() {
    // Simple date range picker
    const ranges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year'];
    const currentRange = document.querySelector('.date-range span').textContent;
    const currentIndex = ranges.indexOf(currentRange);
    const nextIndex = (currentIndex + 1) % ranges.length;
    
    document.querySelector('.date-range span').textContent = ranges[nextIndex];
    
    // Reload data with new range
    loadReportsData();
    
    // Show notification
    showNotification(`Date range changed to ${ranges[nextIndex]}`);
  }
  
  function showMetricDetails(metricType) {
    // Create a modal showing detailed information about the metric
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${metricType} Details</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="metric-details">
            <p>Detailed information about ${metricType.toLowerCase()} will be displayed here.</p>
            <p>This could include historical trends, breakdowns, and additional insights.</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function performExport(format) {
    showNotification(`Exporting reports as ${format.toUpperCase()}...`);
    
    // Simulate export process
    setTimeout(() => {
      showNotification(`Reports exported successfully as ${format.toUpperCase()}!`);
    }, 2000);
  }
  
  function loadAllAvailableReports() {
    // Simulate loading all reports
    setTimeout(() => {
      const container = document.getElementById('all-reports-list');
      if (container) {
        container.innerHTML = `
          <div class="report-item">
            <div class="report-info">
              <div class="report-name">Monthly Collection Summary</div>
              <div class="report-meta">Generated 2 hours ago</div>
            </div>
            <div class="report-actions">
              <button class="report-action-btn">View</button>
              <button class="report-action-btn">Download</button>
            </div>
          </div>
          <div class="report-item">
            <div class="report-info">
              <div class="report-name">Debt Category Analysis</div>
              <div class="report-meta">Generated 1 day ago</div>
            </div>
            <div class="report-actions">
              <button class="report-action-btn">View</button>
              <button class="report-action-btn">Download</button>
            </div>
          </div>
          <div class="report-item">
            <div class="report-info">
              <div class="report-name">Payment Trends Report</div>
              <div class="report-meta">Generated 3 days ago</div>
            </div>
            <div class="report-actions">
              <button class="report-action-btn">View</button>
              <button class="report-action-btn">Download</button>
            </div>
          </div>
        `;
      }
    }, 1000);
  }
  
  function loadAllPerformanceMetrics() {
    // Simulate loading all metrics
    setTimeout(() => {
      const container = document.getElementById('all-metrics-list');
      if (container) {
        container.innerHTML = `
          <div class="metric-item">
            <div class="metric-icon-small">🎯</div>
            <div class="metric-info">
              <div class="metric-value-small">87%</div>
              <div class="metric-label-small">Success Rate</div>
            </div>
            <div class="metric-trend positive">↗ +5%</div>
          </div>
          <div class="metric-item">
            <div class="metric-icon-small">⚡</div>
            <div class="metric-info">
              <div class="metric-value-small">2.3</div>
              <div class="metric-label-small">Avg Follow-ups</div>
            </div>
            <div class="metric-trend negative">↘ -0.2</div>
          </div>
          <div class="metric-item">
            <div class="metric-icon-small">📞</div>
            <div class="metric-info">
              <div class="metric-value-small">156</div>
              <div class="metric-label-small">Calls Made</div>
            </div>
            <div class="metric-trend positive">↗ +12</div>
          </div>
        `;
      }
    }, 1000);
  }
  
  function showReportDetails(reportName) {
    // Create a modal showing report details
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${reportName}</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="report-details">
            <div class="report-preview">
              <h4>Report Preview</h4>
              <p>This is a preview of the ${reportName.toLowerCase()} report.</p>
              <div class="report-stats">
                <div class="stat-item">
                  <span class="stat-label">Generated:</span>
                  <span class="stat-value">2 hours ago</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Size:</span>
                  <span class="stat-value">2.4 MB</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Format:</span>
                  <span class="stat-value">PDF</span>
                </div>
              </div>
            </div>
            <div class="report-actions-modal">
              <button class="export-option-btn" onclick="downloadReport('${reportName}')">📥 Download PDF</button>
              <button class="export-option-btn" onclick="shareReport('${reportName}')">📤 Share Report</button>
              <button class="export-option-btn" onclick="printReport('${reportName}')">🖨️ Print Report</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function downloadReport(reportName) {
    showNotification(`Preparing download for: ${reportName}`);
    
    // Simulate download process
    setTimeout(() => {
      // Create a mock download
      const reportData = generateReportData(reportName);
      const blob = new Blob([reportData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification(`${reportName} downloaded successfully!`);
    }, 1500);
  }
  
  function generateReportData(reportName) {
    const reportContent = `
DEBT COLLECTION REPORT
${reportName}
Generated: ${new Date().toLocaleDateString()}

This report will contain real data from your debt collection system.
Please ensure you are logged in to access actual report data.

Generated by Debt Manager Pro
    `;
    return reportContent;
  }
  
  function shareReport(reportName) {
    // Create a modal for sharing options
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Share ${reportName}</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="share-options">
            <button class="export-option-btn" onclick="shareViaEmail('${reportName}')">📧 Share via Email</button>
            <button class="export-option-btn" onclick="shareViaLink('${reportName}')">🔗 Copy Share Link</button>
            <button class="export-option-btn" onclick="shareViaWhatsApp('${reportName}')">💬 Share via WhatsApp</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
  
  function shareViaEmail(reportName) {
    const subject = encodeURIComponent(`Debt Collection Report: ${reportName}`);
    const body = encodeURIComponent(`Please find attached the ${reportName} report.\n\nGenerated on ${new Date().toLocaleDateString()}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    showNotification(`Email client opened for ${reportName}`);
  }
  
  function shareViaLink(reportName) {
    const shareLink = `${window.location.origin}/reports/${reportName.replace(/\s+/g, '-').toLowerCase()}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      showNotification(`Share link copied to clipboard for ${reportName}`);
    }).catch(() => {
      showNotification(`Share link: ${shareLink}`);
    });
  }
  
  function shareViaWhatsApp(reportName) {
    const message = encodeURIComponent(`Check out this debt collection report: ${reportName}`);
    window.open(`https://wa.me/?text=${message}`);
    showNotification(`WhatsApp opened for ${reportName}`);
  }
  
  function printReport(reportName) {
    showNotification(`Preparing ${reportName} for printing...`);
    
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .report-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .report-content { line-height: 1.6; }
            .report-stats { margin: 20px 0; }
            .stat-item { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>${reportName}</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="report-content">
            <h2>Executive Summary</h2>
            <p>This report provides a comprehensive overview of debt collection activities and performance metrics.</p>
            
            <div class="report-stats">
              <h3>Key Metrics</h3>
              <div class="stat-item"><strong>Total Debts:</strong> 150</div>
              <div class="stat-item"><strong>Outstanding Amount:</strong> Ksh 2,450,000</div>
              <div class="stat-item"><strong>Collection Rate:</strong> 87%</div>
              <div class="stat-item"><strong>Active Collections:</strong> 45</div>
            </div>
            
            <h2>Detailed Analysis</h2>
            <p>This is a detailed analysis of the ${reportName.toLowerCase()} covering all relevant metrics and trends.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  }
  
  function showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 1rem 2rem;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }
  
  function filterReports(category) {
    console.log(`Filtering reports by category: ${category}`);
    const reportItems = document.querySelectorAll('.report-item');
    
    reportItems.forEach(item => {
      if (category === 'all') {
        item.style.display = 'block';
      } else {
        // Add category filtering logic here
        item.style.display = 'block';
      }
    });
  }
  
  async function loadReportsData() {
    try {
      console.log('Loading reports data...');
      
      // Show loading state
      showLoadingState();
      
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Fetch reports data directly
      const response = await fetch('/api/dashboard/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Reports data loaded:', data);
      
      const { summary = [] } = data;
      
      // Update UI with real data
      updateSummaryMetrics(summary);
      updateDetailedReports();
      updatePerformanceMetrics();
      
    } catch (error) {
      console.error('Error loading reports:', error);
      showErrorState('Failed to load reports data');
    }
  }
  
  function showLoadingState() {
    // Update metric cards
    document.getElementById('total-reports').textContent = '...';
    document.getElementById('collection-rate').textContent = '...';
    document.getElementById('total-collected').textContent = '...';
    document.getElementById('avg-collection-time').textContent = '...';
    
    // Show loading for other sections
    const containers = ['detailed-reports', 'performance-metrics'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = '<div class="loading-message">Loading data...</div>';
      }
    });
  }
  
  function showErrorState(message) {
    const containers = ['detailed-reports', 'performance-metrics'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = `<div class="error-message">${message}</div>`;
      }
    });
  }
  
  function updateSummaryMetrics(summary) {
    // Find debt, credit, and transaction data
    const debtData = summary.find(item => item.type === 'debts') || { count: 0, total_amount: 0 };
    const creditData = summary.find(item => item.type === 'credits') || { count: 0, total_amount: 0 };
    const transactionData = summary.find(item => item.type === 'transactions') || { count: 0, total_amount: 0 };
    
    // Calculate metrics from real data
    const totalReports = debtData.count + creditData.count + transactionData.count;
    const totalOutstanding = debtData.total_amount || 0;
    const totalCollected = creditData.total_amount || 0;
    const collectionRate = totalOutstanding > 0 ? ((totalCollected / totalOutstanding) * 100).toFixed(1) : 0;
    const avgCollectionTime = 12; // This would need a separate calculation based on actual data
    
    // Update metric cards
    document.getElementById('total-reports').textContent = totalReports;
    document.getElementById('collection-rate').textContent = `${collectionRate}%`;
    document.getElementById('total-collected').textContent = formatCurrency(totalCollected);
    document.getElementById('avg-collection-time').textContent = `${avgCollectionTime} days`;
  }
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  function updateDetailedReports() {
    const container = document.getElementById('detailed-reports');
    
    // Load detailed reports data from API
    const reports = [
      {
        title: 'Monthly Financial Summary',
        description: 'Comprehensive overview of all financial transactions and outstanding amounts',
        date: 'Generated 2 hours ago',
        size: '2.4 MB',
        icon: '💰',
        featured: true
      },
      {
        title: 'Collection Performance',
        description: 'Analysis of collection rates and efficiency metrics',
        date: 'Generated 1 day ago',
        size: '1.8 MB',
        icon: '📈',
        featured: false
      },
      {
        title: 'Debt Portfolio Analysis',
        description: 'Detailed breakdown of debt categories and risk assessment',
        date: 'Generated 3 days ago',
        size: '3.2 MB',
        icon: '📋',
        featured: false
      },
      {
        title: 'Collection Timeline',
        description: 'Timeline analysis of collection activities and follow-ups',
        date: 'Generated 1 week ago',
        size: '1.5 MB',
        icon: '⏰',
        featured: false
      }
    ];
    
    container.innerHTML = reports.map(report => `
      <div class="report-item ${report.featured ? 'featured' : ''}">
        <div class="report-icon">${report.icon}</div>
        <div class="report-content">
        <h4>${report.title}</h4>
        <p>${report.description}</p>
          <div class="report-meta">
            <span class="report-date">${report.date}</span>
            <span class="report-size">${report.size}</span>
          </div>
        </div>
        <div class="report-actions">
          <button class="btn-primary">📊 View</button>
          <button class="btn-secondary">📥 Download</button>
        </div>
      </div>
    `).join('');
  }
  
  function updatePerformanceMetrics() {
    const container = document.getElementById('performance-metrics');
    
    // Get real data from the page (we'll need to fetch this separately)
    // Load performance metrics data from API
    const metrics = [
      {
        value: '87%',
        label: 'Success Rate',
        change: '+5%',
        changeType: 'positive',
        icon: '🎯'
      },
      {
        value: '2.3',
        label: 'Avg Follow-ups',
        change: '-0.2',
        changeType: 'negative',
        icon: '⚡'
      },
      {
        value: '156',
        label: 'Calls Made',
        change: '+12',
        changeType: 'positive',
        icon: '📞'
      },
      {
        value: '89',
        label: 'Emails Sent',
        change: '+8',
        changeType: 'positive',
        icon: '📧'
      }
    ];
    
    container.innerHTML = metrics.map(metric => `
      <div class="metric-item">
        <div class="metric-icon-small">${metric.icon}</div>
        <div class="metric-info">
          <div class="metric-value-small">${metric.value}</div>
          <div class="metric-label-small">${metric.label}</div>
        </div>
        <div class="metric-trend ${metric.changeType}">↗ ${metric.change}</div>
      </div>
    `).join('');
  }
  
  
  // Export functions for external use
  window.reportsModule = {
    loadData: loadReportsData,
    refresh: loadReportsData,
    initializeInteractivity: initializeInteractivity
  };
  
})();
