import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Axios instance بدون interceptor برای refresh ───
// (جلوگیری از loop بی‌نهایت)
const rawAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: پیوست accessToken ───
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Refresh token lock (تا درخواست‌های موازی یک بار refresh بزنن) ───
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const { data } = await rawAxios.post('/auth/refresh', { refreshToken });
    if (data?.accessToken && data?.refreshToken) {
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Response interceptor ───
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // شبکه قطع یا timeout
    if (!error.response) {
      toast.error('ارتباط با سرور برقرار نشد.');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/refresh') || url.includes('/auth/login');

    // ─── تلاش برای refresh روی 401 ───
    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      // فقط یک درخواست refresh در آن واحد
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      // refresh fail → logout
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // ─── سایر خطاها ───
    if (status >= 500) {
      toast.error('خطای داخلی سرور رخ داد.');
    }
    return Promise.reject(error);
  }
);
