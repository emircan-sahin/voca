import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@voca/shared';
import { useAuthStore } from '~/stores/auth.store';
import { useNavigationStore } from '~/stores/navigation.store';

export class ApiError extends Error {
  data: unknown;
  status?: number;
  constructor(message: string, data: unknown = null, status?: number) {
    super(message);
    this.data = data;
    this.status = status;
  }
}

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3100/api',
});

// Attach Bearer token to every request
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
    const original = error.config;
    const status = error.response?.status;

    // Try refresh on 401 (skip only login/refresh endpoints to avoid loops)
    const isAuthFlow = original.url === '/auth/refresh' || original.url?.startsWith('/auth/google');
    if (status === 401 && !original._retry && !isAuthFlow) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axiosInstance(original));
      }

      original._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
      if (!refreshToken) {
        isRefreshing = false;
        clearAuth();
        return Promise.reject(new ApiError('Unauthorized', null, 401));
      }

      try {
        const res = await axios.post(`${axiosInstance.defaults.baseURL}/auth/refresh`, { refreshToken });
        const { token: newToken, refreshToken: newRt } = res.data.data;
        setTokens({ token: newToken, refreshToken: newRt });
        processQueue(null);
        return axiosInstance(original);
      } catch (refreshError: unknown) {
        processQueue(refreshError);
        // Only clear auth on definitive rejection (4xx) from refresh endpoint.
        // Network errors or 5xx mean the server is temporarily unreachable —
        // keep tokens so the user isn't logged out during maintenance.
        const refreshStatus = axios.isAxiosError(refreshError)
          ? refreshError.response?.status
          : undefined;
        if (refreshStatus && refreshStatus >= 400 && refreshStatus < 500) {
          clearAuth();
        }
        return Promise.reject(refreshError);
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

    // Redirect to billing on 402 (no plan or insufficient credits)
    if (status === 402) {
      const body = error.response?.data;
      const message = body?.message || 'Payment required';
      useNavigationStore.setState({ view: 'billing' });
      return Promise.reject(new ApiError(message, body?.data, status));
    }

    const body = error.response?.data;
    const message = body?.message || 'An unexpected error occurred';
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
