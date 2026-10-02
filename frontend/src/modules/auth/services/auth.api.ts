import { api } from '@/services/api';
import type { LoginResponse } from '@/types';

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
    return data;
  },
  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  updatePreferences: async (themePreference: string) => {
    const { data } = await api.patch('/auth/preferences', { themePreference });
    return data;
  },
};

export const profileApi = {
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.patch('/auth/change-password', { oldPassword, newPassword });
    return data;
  },
  updateProfile: async (payload: { fullName?: string; email?: string; mobile?: string }) => {
    const { data } = await api.patch('/auth/profile', payload);
    return data;
  },
};
