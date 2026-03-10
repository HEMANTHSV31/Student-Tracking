/**
 * API utility for making authenticated requests with httpOnly cookies
 * Replaces the need for Authorization headers
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Make an authenticated API request using httpOnly cookies
 * @param {string} endpoint - API endpoint (e.g., '/students', '/tasks/venues')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  // Get token from localStorage as fallback for cookie issues
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  // If body is FormData, remove Content-Type header (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  return fetch(url, defaultOptions);
};

/**
 * Helper for GET requests
 */
export const apiGet = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

/**
 * Helper for POST requests
 */
export const apiPost = (endpoint, body, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
};

/**
 * Helper for PUT requests
 */
export const apiPut = (endpoint, body, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
};

/**
 * Helper for DELETE requests
 */
export const apiDelete = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

export default apiRequest;
