// API configuration - automatically detects environment
const API_BASE_URL = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : ''; // Use relative URL on Render (same origin)

export const API_URL = API_BASE_URL;

