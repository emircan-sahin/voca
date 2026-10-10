import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import i18n from 'i18next';
import { ApiResponse } from '@voca/shared';
import { useAuthStore } from '~/stores/auth.store';
// import { useNavigationStore } from '~/stores/navigation.store'; // only used by the disabled 402 redirect

export class ApiError extends Error {
  data: unknown;
  status?: number;
  constructor(message: string, data: unknown = null, status?: number) {
    super(message);
    this.data = data;
    this.status = status;
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    // The caller handles a network failure itself, so don't swap the app for the splash screen
    skipOfflineSignal?: boolean;
  }
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // Without it a stalled connection leaves the caller (e.g. startup hydrate) waiting forever
  timeout: 30_000,
});

// Attach Bearer token and language to every request
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Accept-Language'] = i18n.language || 'en';
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)));
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    // An aborted request (e.g. superseded settings save) is not an outage
    if (axios.isCancel(error)) return Promise.reject(error);

    const original = error.config;
    const status = error.response?.status;
    const signalOffline = () => {
      if (!original?.skipOfflineSignal) window.dispatchEvent(new Event('backend-offline'));
    };

    // Try refresh on 401 (skip only login/refresh endpoints to avoid loops)
    const isAuthFlow = ['/auth/refresh', '/auth/exchange'].includes(original?.url) || original?.url?.startsWith('/auth/google');
    if (status === 401 && original && !original._retry && !isAuthFlow) {
      // One retry per request, queued ones included — otherwise a still-failing
      // request would trigger another refresh cycle
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosInstance(original));
      }

      // Request went out with a token that has since been rotated — just retry, no new refresh
      const sentAuth = original.headers?.Authorization;
      const currentToken = useAuthStore.getState().token;
      if (currentToken && sentAuth && sentAuth !== `Bearer ${currentToken}`) {
        return axiosInstance(original);
      }

      isRefreshing = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
      if (!refreshToken) {
        isRefreshing = false;
        clearAuth();
        return Promise.reject(new ApiError('Unauthorized', null, 401));
      }

      try {
        // Raw axios skips our interceptors; the timeout keeps queued requests from hanging forever
        const res = await axios.post(`${axiosInstance.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: 15_000 });
        const { token: newToken, refreshToken: newRt } = res.data.data;
        setTokens({ token: newToken, refreshToken: newRt });
        processQueue(null);
        return axiosInstance(original);
      } catch (refreshError: unknown) {
        // Queued callers and the original one expect ApiError (toasts read .message)
        const refreshBody = axios.isAxiosError(refreshError) ? refreshError.response?.data : undefined;
        const refreshFailure = new ApiError(
          refreshBody?.message || 'Session expired',
          refreshBody?.data,
          axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined
        );
        processQueue(refreshFailure);
        // Only clear auth on definitive rejection (4xx) from refresh endpoint.
        // Network errors or 5xx mean the server is temporarily unreachable —
        // keep tokens so the user isn't logged out during maintenance.
        const refreshStatus = axios.isAxiosError(refreshError)
          ? refreshError.response?.status
          : undefined;
        if (refreshStatus && refreshStatus >= 400 && refreshStatus < 500) {
          clearAuth();
        } else if (!refreshStatus) {
          signalOffline();
        }
        return Promise.reject(refreshFailure);
      } finally {
        isRefreshing = false;
      }
    }

    // Rate limit exceeded
    if (status === 429) {
      const body = error.response?.data;
      const message = body?.message || 'Too many requests, please slow down';
      return Promise.reject(new ApiError(message, body?.data, status));
    }

    // Redirect to billing on 402 (no plan or insufficient credits).
    // Paid plans are disabled and the billing view isn't mounted, so a redirect would show a blank page.
    // if (status === 402) {
    //   const body = error.response?.data;
    //   const message = body?.message || 'Payment required';
    //   useNavigationStore.setState({ view: 'billing' });
    //   return Promise.reject(new ApiError(message, body?.data, status));
    // }

    // No response means the server is unreachable — signal splash retry
    if (!error.response) {
      signalOffline();
      return Promise.reject(new ApiError(i18n.t('error.network')));
    }

    const body = error.response.data;
    const message = body?.message || i18n.t('error.unexpected');
    return Promise.reject(new ApiError(message, body?.data, status));
  }
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get(url, config) as unknown as Promise<ApiResponse<T>>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post(url, data, config) as unknown as Promise<ApiResponse<T>>,
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.put(url, data, config) as unknown as Promise<ApiResponse<T>>,
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete(url, config) as unknown as Promise<ApiResponse<T>>,
};

export default axiosInstance;
