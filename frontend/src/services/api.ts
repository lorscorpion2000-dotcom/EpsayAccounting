import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore } from '@/store/project.store';

const getDynamicApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return 'http://' + host + ':3000/api';
  }
  return 'http://localhost:3000/api';
};

const BASE_URL = getDynamicApiUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const rawAxios = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeProjectId = useProjectStore.getState().activeProjectId;
  if (activeProjectId) {
    config.headers['X-Active-Project'] = activeProjectId;
  }
  return config;
});

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

api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      toast.error('خطای ارتباط: سرور بک‌اند پاسخگو نیست.');
      return Promise.reject(new Error('HTML response received from API endpoint'));
    }
    return response;
  },
  async (error: AxiosError<any>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!error.response) {
      toast.error('ارتباط با سرور برقرار نشد.');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/refresh') || url.includes('/auth/login');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

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

      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error('خطای داخلی سرور رخ داد.');
    }
    return Promise.reject(error);
  }
);
