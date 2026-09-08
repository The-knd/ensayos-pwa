import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

let isRefreshing = false;
let queue: Array<() => void> = [];

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // No intervenir en login/refresh/logout — esos endpoints manejan sus propios errores
    const isAuthRequest =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await httpClient.post('/auth/refresh');
          queue.forEach((cb) => cb());
          queue = [];
        } catch {
          // Refresh falló → solo redirigimos si NO estamos ya en login (evita loop)
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          queue = [];
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        queue.push(() => resolve(httpClient(originalRequest)));
      });
    }
    return Promise.reject(error);
  },
);