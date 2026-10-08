import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2001/api/v1';

const API = axios.create({
  baseURL,
  withCredentials: true,
});

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthCall = url.includes('/users/refresh-token') || url.includes('/users/login') || url.includes('/users/register');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      try {
        await axios.post(`${baseURL}/users/refresh-token`, {}, { withCredentials: true });
        return API(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
