import axios from 'axios';

export function getApiUrl() {
  const custom = localStorage.getItem('chat_app_backend_url');
  if (custom) return custom;
  
  // Nếu có biến môi trường VITE_API_URL được cấu hình
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Khi chạy trên server production (Render, Railway, VPS...), tự động nhận domain hiện tại
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }

  return 'http://localhost:5000';
}

export function setApiUrl(url) {
  if (!url) {
    localStorage.removeItem('chat_app_backend_url');
  } else {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem('chat_app_backend_url', cleanUrl);
  }
}

const http = axios.create();

http.interceptors.request.use((config) => {
  const currentBase = getApiUrl();
  config.baseURL = `${currentBase}/api`;
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
export const API_URL = getApiUrl();
