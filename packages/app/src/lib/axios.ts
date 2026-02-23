import axios, { AxiosRequestConfig } from 'axios';
import { ApiResponse } from '@voca/shared';

export class ApiError extends Error {
  data: unknown;
  constructor(message: string, data: unknown = null) {
    super(message);
    this.data = data;
  }
}

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3100/api',
});

axiosInstance.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const body = error.response?.data;
    const message = body?.message || 'An unexpected error occurred';
    return Promise.reject(new ApiError(message, body?.data));
  }
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get(url, config) as unknown as Promise<ApiResponse<T>>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post(url, data, config) as unknown as Promise<ApiResponse<T>>,
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete(url, config) as unknown as Promise<ApiResponse<T>>,
};

export default axiosInstance;
