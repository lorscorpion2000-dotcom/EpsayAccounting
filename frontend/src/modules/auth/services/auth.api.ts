import { api } from '@/services/api';
import type {
  LoginResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  TwoFactorStatusResponse,
  TwoFactorVerifyResponse,
} from '@/types';

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
    return data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
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

  // ─── 2FA ───
  verify2FA: async (
    totpToken: string,
    code: string,
  ): Promise<TwoFactorVerifyResponse> => {
    const { data } = await api.post<TwoFactorVerifyResponse>('/auth/2fa/verify', {
      totpToken,
      code,
    });
    return data;
  },

  status2FA: async (): Promise<TwoFactorStatusResponse> => {
    const { data } = await api.get<TwoFactorStatusResponse>('/auth/2fa/status');
    return data;
  },

  setup2FA: async (): Promise<TwoFactorSetupResponse> => {
    const { data } = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup');
    return data;
  },

  enable2FA: async (code: string): Promise<TwoFactorEnableResponse> => {
    const { data } = await api.post<TwoFactorEnableResponse>('/auth/2fa/enable', { code });
    return data;
  },

  disable2FA: async (password: string): Promise<{ success: boolean }> => {
    const { data } = await api.post<{ success: boolean }>('/auth/2fa/disable', { password });
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
  setSignature: async (signatureUrl: string | null) => {
    const { data } = await api.patch('/auth/signature', { signatureUrl });
    return data;
  },
};
