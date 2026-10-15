import axios from 'axios';
import { isDemo } from '../lib/env';
import { store } from '../lib/storage';
import { installDemoBackend } from '../demo';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = store.getItem('certflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Path the user is currently on, for either router type. */
function currentPath(): string {
  return isDemo ? window.location.hash.replace(/^#/, '') : window.location.pathname;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const path = currentPath();
    if (error.response?.status === 401 && !path.startsWith('/login') && !path.startsWith('/verify')) {
      store.removeItem('certflow_token');
      store.removeItem('certflow_user');
      window.location.href = isDemo ? '#/login' : '/login';
    }
    return Promise.reject(error);
  }
);

// In demo mode both this instance and the global axios (used by the public
// verification page) talk to the in-browser mock instead of the network.
if (isDemo) {
  installDemoBackend([axios as any, api]);
}

export default api;
