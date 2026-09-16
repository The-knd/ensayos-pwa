import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: {
    // Mitigación CSRF pragmática: un formulario cross-site no puede fijar este
    // header, así que el backend lo exige en toda mutación (ver CsrfMiddleware).
    'X-Requested-With': 'XMLHttpRequest',
  },
});

/** Lee una cookie (sin httpOnly — csrf_token NO lo es a propósito). */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// Double-submit CSRF: toda mutación lleva X-CSRF-Token con el valor de la
// cookie csrf_token (emitida al iniciar sesión).
httpClient.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const isMutation = !['get', 'head', 'options'].includes(method);
  if (isMutation) {
    const csrf = getCookie('csrf_token');
    if (csrf) {
      config.headers = config.headers ?? {};
      config.headers['X-CSRF-Token'] = csrf;
    }

    // Idempotencia: una clave compartida por sesión de pestaña. La clave se
    // regenera tras cada mutación satisfactoria (ver response interceptor),
    // de modo que un doble-click / retry de red reúse la misma clave y el
    // backend deduplique, pero una operación nueva no choque con la anterior.
    const url = config.url ?? '';
    const isAuthRequest =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');
    if (!isAuthRequest) {
      config.headers['Idempotency-Key'] = idempotencyKey();
    }
  }
  return config;
});

// Idempotency-Key por sesión de pestaña: se reusa mientras una operación
// mutante esté en vuelo (retry/click repetido), y se regenera al completar.
function idempotencyKey(): string {
  const stored = sessionStorage.getItem('pwa_idempotency_key');
  if (stored) return stored;
  const key = crypto.randomUUID();
  sessionStorage.setItem('pwa_idempotency_key', key);
  return key;
}

function clearIdempotencyKey(): void {
  sessionStorage.removeItem('pwa_idempotency_key');
}

let isRefreshing = false;
let queue: Array<() => void> = [];

httpClient.interceptors.response.use(
  (response) => {
    const method = (response.config.method ?? 'get').toLowerCase();
    if (['post', 'patch', 'put', 'delete'].includes(method) && response.config.headers?.['Idempotency-Key']) {
      clearIdempotencyKey();
    }
    return response;
  },
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