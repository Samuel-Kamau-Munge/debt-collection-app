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

// Navigation helper
function setActiveNavLink(activeId) {
  // Remove active class from all nav links
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to clicked link
  const activeLink = document.getElementById(activeId);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

// Note: Analytics and Reports functionality moved to DashboardController system
// The sidebar navigation now uses data-module attributes for dynamic loading

// Setup sidebar navigation event listeners
function setupSidebarNavigation() {
  console.log('🔧 Setting up sidebar navigation...');

  // Add click event listeners to all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🔗 Nav link clicked:', this.id, 'data-module:', this.getAttribute('data-module'));

      // Set active state
      setActiveNavLink(this.id);

      // Load the module if DashboardController is available
      const modulePath = this.getAttribute('data-module');
      if (modulePath && window.dashboardController) {
        window.dashboardController.loadModule(modulePath);
      } else if (modulePath) {
        console.log('⚠️ DashboardController not available, module loading skipped');
      }
    });
  });

  console.log('✅ Sidebar navigation setup complete');
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 DOM Content Loaded - Initializing dashboard...');

  // Setup sidebar navigation
  setupSidebarNavigation();

  console.log('✅ Dashboard initialization complete');
});
