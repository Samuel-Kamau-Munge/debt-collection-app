// Shared API utilities for consistent data loading across all modules
(function() {
  'use strict';

  // Default timeout (15 seconds)
  const DEFAULT_TIMEOUT = 15000;
  // Default max retries
  const MAX_RETRIES = 2;
  // Retry delay (1 second)
  const RETRY_DELAY = 1000;

  /**
   * Fetch with timeout
   */
  function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout - server took too long to respond'));
      }, timeout);

      fetch(url, options)
        .then(response => {
          clearTimeout(timer);
          resolve(response);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Fetch with retry logic
   */
  async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES, timeout = DEFAULT_TIMEOUT) {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetchWithTimeout(url, options, timeout);
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`API call attempt ${i + 1} failed:`, error.message);
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Authentication')) {
          throw error;
        }
        
        // Wait before retrying (except on last attempt)
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get authentication token
   */
  function getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  /**
   * Standard API call with timeout, retry, and auth
   */
  async function apiCall(endpoint, options = {}) {
    const skipAuth = options.skipAuth || false;
    const token = getAuthToken();
    
    if (!token && !skipAuth) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && !skipAuth ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    };

    // Copy other options (method, body, etc.) but skip skipAuth
    Object.keys(options).forEach(key => {
      if (key !== 'skipAuth' && key !== 'headers') {
        defaultOptions[key] = options[key];
      }
    });

    try {
      const response = await fetchWithRetry(endpoint, defaultOptions);
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  /**
   * Show loading state helper
   */
  function showLoadingState(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<div class="loading-message">${message}</div>`;
    }
  }

  /**
   * Show error state helper
   */
  function showErrorState(elementId, message, onRetry = null) {
    const element = document.getElementById(elementId);
    if (element) {
      const retryButton = onRetry ? `<button onclick="${onRetry}" class="btn-primary" style="margin-top: 1rem;">Retry</button>` : '';
      element.innerHTML = `
        <div class="error-message">
          <h3>⚠️ Error</h3>
          <p>${message}</p>
          ${retryButton}
        </div>
      `;
    }
  }

  // Export functions
  window.apiUtils = {
    fetchWithTimeout,
    fetchWithRetry,
    apiCall,
    getAuthToken,
    showLoadingState,
    showErrorState,
    DEFAULT_TIMEOUT,
    MAX_RETRIES
  };
})();

