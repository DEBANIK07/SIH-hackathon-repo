/**
 * OJAS Main Application Logic & Backend API Gateway Wrapper
 * Handles navigation state, backend fetch calls with live status logging,
 * and UI interaction handlers.
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Backend API Fetch Wrapper with Live Status Feedback logging
 * @param {string} endpoint - API route e.g. '/api/v1/assess'
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<any>} Response JSON data
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';

  if (window.StatusLog) {
    window.StatusLog.log(`Initiating API Request: ${method} ${url}`, 'CALL', 'FETCH');
  }

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);

    if (response.ok) {
      const data = await response.json();
      if (window.StatusLog) {
        window.StatusLog.log(`HTTP ${response.status} OK (${duration}ms) - Endpoint ${endpoint}`, 'SUCCESS', 'FETCH');
      }
      return { success: true, data };
    } else {
      if (window.StatusLog) {
        window.StatusLog.log(`HTTP ${response.status} ${response.statusText} (${duration}ms)`, 'ERROR', 'FETCH');
      }
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    if (window.StatusLog) {
      window.StatusLog.log(
        `Backend server offline or unreachable at ${API_BASE_URL} (${duration}ms). Using local mock fallback.`,
        'WARN',
        'FETCH'
      );
    }
    // Mock fallback response for Phase 0-1 demonstration
    return getMockAPIResponse(endpoint, options);
  }
}

/**
 * Provides graceful mock responses when backend server is offline
 */
function getMockAPIResponse(endpoint, options) {
  if (endpoint.includes('/health')) {
    return { success: true, data: { status: 'ONLINE_MOCK', platform: 'OJAS Phase 1' } };
  }
  if (endpoint.includes('/solar-potential')) {
    return {
      success: true,
      data: {
        annual_generation_kwh: 4850,
        estimated_capacity_kw: 3.5,
        subsidy_amount_inr: 78000,
        payback_years: 3.2,
        co2_offset_tons: 4.1
      }
    };
  }
  return { success: true, data: { message: 'Mock response OK', endpoint } };
}

/**
 * Health check on boot to verify backend status
 */
async function checkBackendHealth() {
  if (window.StatusLog) {
    window.StatusLog.log('Ping test to http://localhost:8000/api/v1/health...', 'INFO', 'SYSTEM');
  }
  await fetchAPI('/api/v1/health');
}

/**
 * Handle Planner View link click
 */
function handlePlannerViewClick(event) {
  event.preventDefault();
  if (window.StatusLog) {
    window.StatusLog.log('Planner View clicked. Module status: COMING SOON (Phase 3).', 'INFO', 'NAV');
  }
  alert('Planner View is under active development for Phase 3 (DISCOM & Municipal Grid Integration). Stay tuned!');
}

// Global DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Bind Planner View disabled nav link
  const plannerLink = document.getElementById('nav-planner-view');
  if (plannerLink) {
    plannerLink.addEventListener('click', handlePlannerViewClick);
  }

  // Perform initial system health check
  setTimeout(checkBackendHealth, 800);
});

// Export fetchAPI globally
window.fetchAPI = fetchAPI;
