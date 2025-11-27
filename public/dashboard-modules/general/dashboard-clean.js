// General Dashboard Controller
class DashboardController {
  constructor() {
    this.currentModule = null;
    this.modules = new Map();
    this.alerts = [];
    this.alertCount = 0;
    this.pollingInterval = null;
    this.socket = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthentication();
    this.loadUserProfile();
    this.loadAlerts();
  }

  setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const module = link.getAttribute('data-module');
        if (module) {
          this.loadModule(module);
          this.setActiveNavLink(link);
        }
      });
    });

    // User profile dropdown
    const userProfile = document.querySelector('.user-profile');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userProfile && userDropdown) {
      userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        userDropdown.style.display = 'none';
        if (alertsDropdown) {
          alertsDropdown.classList.remove('show');
        }
      });
    }

    // Alerts dropdown
    const alertsBtn = document.getElementById('alerts-btn');
    const alertsDropdown = document.getElementById('alerts-dropdown');
    
    if (alertsBtn && alertsDropdown) {
      alertsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alertsDropdown.classList.toggle('show');
      });
    }

    // Quick stats navigation
    document.querySelectorAll('.quick-stat').forEach((stat, index) => {
      stat.addEventListener('click', () => {
        const modules = ['overview/analytics', 'credit-management/view-credits', 'transaction-management/pending-transactions'];
        if (modules[index]) {
          this.loadModule(modules[index]);
          this.setActiveNavLinkByModule(modules[index]);
        }
      });
    });
  }

  checkAuthentication() {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      console.log('No authentication token found');
      // Redirect to login or show login form
    }
  }

  loadUserProfile() {
    const userName = document.getElementById('user-name');
    if (userName) {
      userName.textContent = 'User'; // Default name
    }
  }

  // Alert System Methods
  async loadAlerts() {
    console.log('⚠️ Loading alerts...');
    try {
      // Load alerts from localStorage or create sample alerts
      this.alerts = this.getStoredAlerts() || this.createSampleAlerts();
      this.alertCount = this.alerts.filter(alert => !alert.dismissed).length;
      
      console.log('⚠️ Loaded alerts:', this.alerts.length, 'active:', this.alertCount);
      this.updateAlertDisplay();
      
      // Check for overdue debts and credits periodically
      this.startAlertChecker();
      
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.alerts = [];
      this.alertCount = 0;
      this.updateAlertDisplay();
    }
  }

  getStoredAlerts() {
    try {
      const stored = localStorage.getItem('debtManagerAlerts');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading stored alerts:', error);
      return null;
    }
  }

  storeAlerts() {
    try {
      localStorage.setItem('debtManagerAlerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Error storing alerts:', error);
    }
  }

  createSampleAlerts() {
    const today = new Date();
    const alerts = [
      {
        id: 'alert-1',
        type: 'debt_overdue',
        priority: 'urgent',
        title: 'CRITICAL: Payment Overdue - 588 days',
        message: 'Payment of Ksh 15,000 from Test Debtor Management is 588 days overdue since March 15, 2024. URGENT: Immediate action required!',
        timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        dismissed: false
      },
      {
        id: 'alert-2',
        type: 'debt_overdue',
        priority: 'urgent',
        title: 'CRITICAL: Payment Overdue - 297 days',
        message: 'Payment of Ksh 1,000 from Test Debtor is 297 days overdue since December 31, 2024. URGENT: Immediate action required!',
        timestamp: new Date(today.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        dismissed: false
      },
      {
        id: 'alert-3',
        type: 'debt_overdue',
        priority: 'high',
        title: 'Payment Overdue Alert - 11 days',
        message: 'Payment of Ksh 1 from Mercy Munge is 11 days overdue since October 13, 2025. Please follow up immediately.',
        timestamp: new Date(today.getTime() - 30 * 60 * 1000), // 30 minutes ago
        dismissed: false
      },
      {
        id: 'alert-4',
        type: 'credit_limit',
        priority: 'high',
        title: 'Credit Limit Alert',
        message: 'Credit utilization for Business Credit Account is at 85%. Consider reducing usage to avoid penalties.',
        timestamp: new Date(today.getTime() - 15 * 60 * 1000), // 15 minutes ago
        dismissed: false
      }
    ];
    
    this.storeAlerts();
    return alerts;
  }

  startAlertChecker() {
    // Check for new alerts every 5 minutes
    setInterval(() => {
      this.checkForNewAlerts();
    }, 5 * 60 * 1000);
  }

  checkForNewAlerts() {
    // This would normally check the database for new overdue debts/credits
    // For now, we'll just refresh the display
    console.log('⚠️ Checking for new alerts...');
    this.updateAlertDisplay();
  }

  updateAlertDisplay() {
    console.log('⚠️ Updating alert display:', this.alerts.length, 'alerts,', this.alertCount, 'active');
    
    const countElement = document.getElementById('alert-count');
    const dropdownElement = document.getElementById('alerts-dropdown');

    // Update count badge
    if (countElement) {
      countElement.textContent = this.alertCount;
      countElement.style.display = this.alertCount > 0 ? 'inline' : 'none';
    }

    // Update dropdown content
    if (dropdownElement) {
      const activeAlerts = this.alerts.filter(alert => !alert.dismissed);
      
      if (activeAlerts.length === 0) {
        dropdownElement.innerHTML = `
          <div class="alert-empty">
            <i class="fas fa-check-circle"></i>
            <p>No active alerts</p>
          </div>
        `;
      } else {
        dropdownElement.innerHTML = activeAlerts.map(alert => {
          const iconClass = this.getAlertIcon(alert.type, alert.priority);
          const priorityClass = alert.priority;
          
          return `
            <div class="alert-item ${priorityClass}" 
                 onclick="dismissAlert('${alert.id}')"
                 data-alert-id="${alert.id}">
              <div class="alert-header">
                <span class="alert-icon ${priorityClass}">${iconClass}</span>
                <span class="alert-title">${this.escapeHtml(alert.title)}</span>
                <span class="alert-time">${this.formatAlertTime(alert.timestamp)}</span>
              </div>
              <div class="alert-message">${this.escapeHtml(alert.message)}</div>
            </div>
          `;
        }).join('');
      }
    }
  }

  getAlertIcon(type, priority) {
    if (type === 'debt_overdue') {
      return priority === 'urgent' ? '🚨' : '⚠️';
    } else if (type === 'credit_limit') {
      return '💳';
    } else if (type === 'system') {
      return '⚙️';
    } else {
      return 'ℹ️';
    }
  }

  formatAlertTime(timestamp) {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Module loading methods
  async loadModule(modulePath) {
    try {
      console.log(`Loading module: ${modulePath}`);
      
      // Hide current module
      if (this.currentModule) {
        const currentElement = document.querySelector(`[data-module="${this.currentModule}"]`);
        if (currentElement) {
          currentElement.classList.remove('active');
        }
      }

      // Load new module
      const moduleElement = document.querySelector(`[data-module="${modulePath}"]`);
      if (moduleElement) {
        moduleElement.classList.add('active');
      }

      this.currentModule = modulePath;
      
      // Load module content
      await this.loadModuleContent(modulePath);
      
    } catch (error) {
      console.error('Error loading module:', error);
    }
  }

  async loadModuleContent(modulePath) {
    try {
      const response = await fetch(`/dashboard-modules/${modulePath}/index.html`);
      if (response.ok) {
        const content = await response.text();
        const mainContent = document.querySelector('main');
        if (mainContent) {
          mainContent.innerHTML = content;
        }
      }
    } catch (error) {
      console.error('Error loading module content:', error);
    }
  }

  setActiveNavLink(link) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  }

  setActiveNavLinkByModule(modulePath) {
    const link = document.querySelector(`[data-module="${modulePath}"]`);
    if (link) {
      this.setActiveNavLink(link);
    }
  }

  async refreshCurrentModule() {
    if (this.currentModule === 'overview/analytics' || this.currentModule === 'overview/reports') {
      await this.refreshCurrentModule();
    }
  }
}

// Global functions for module communication
window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  window.location.href = '/login';
};

// Dismiss alert
window.dismissAlert = function(alertId) {
  try {
    console.log('⚠️ Dismissing alert:', alertId);
    
    // Find and dismiss the alert
    const alertIndex = dashboardController.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      dashboardController.alerts[alertIndex].dismissed = true;
      dashboardController.alertCount = dashboardController.alerts.filter(alert => !alert.dismissed).length;
      
      // Store updated alerts
      dashboardController.storeAlerts();
      
      // Update display
      dashboardController.updateAlertDisplay();
      
      console.log('⚠️ Alert dismissed successfully');
    }
  } catch (error) {
    console.error('Error dismissing alert:', error);
  }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.dashboardController = new DashboardController();
});



