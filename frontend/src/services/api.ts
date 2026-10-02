import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string | string[]; statusCode?: number }>) => {
    const status = error.response?.status;

    if (status === 401) {
      const store = useAuthStore.getState();
      if (store.isAuthenticated) {
        store.logout();
        toast.error('Ù†شست Ø´Ù…ا Ù…Ù†Ù‚Ø¶ÛŒ Ø´Ø¯Ù‡ است. Ù„Ø·ÙØ§Ù‹ Ù…Ø¬Ø¯Ø¯Ø§Ù‹ Ùˆارد Ø´ÙˆÛŒد.');
      }
    } else if (status === 403) {
      toast.error('Ø´Ù…ا Ø¨Ù‡ Ø§ÛŒÙ† بخش Ø¯Ø³ØªØ±Ø³ÛŒ Ù†Ø¯Ø§Ø±ÛŒد.');
    } else if (status === 500) {
      toast.error('Ø®Ø·Ø§ÛŒ Ø¯Ø§Ø®Ù„ÛŒ Ø³Ø±Ùˆر. Ù„Ø·ÙØ§Ù‹ با Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ ØªÙ…اس Ø¨Ú¯ÛŒØ±ÛŒد.');
    } else if (!error.response) {
      toast.error('ارتباط با Ø³Ø±Ùˆر Ø¨Ø±Ù‚رار Ù†شد.');
    }

    return Promise.reject(error);
  },
);