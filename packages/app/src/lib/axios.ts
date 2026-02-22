import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3100/api',
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || 'Bir hata oluştu';
    return Promise.reject({ success: false, message, data: null });
  }
);

export default axiosInstance;
