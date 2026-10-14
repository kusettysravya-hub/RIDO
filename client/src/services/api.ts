import axios from 'axios';

// Connect to FastAPI backend (via Vite proxy or direct port 8000)
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT Bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campuscommute_token') || sessionStorage.getItem('campuscommute_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking auth or on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // localStorage.removeItem('campuscommute_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
