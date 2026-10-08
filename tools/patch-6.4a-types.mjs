import fs from 'node:fs';

const FE = 'E:\\EpsayAccounting\\frontend\\src';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(p) { fs.copyFileSync(p, `${p}.bak-${STAMP}`); }

// ═══════════════════════════════════════
// 1) types/index.ts
// ═══════════════════════════════════════
console.log('--- types/index.ts ---');
const typesPath = FE + '\\types\\index.ts';
backup(typesPath);
let types = fs.readFileSync(typesPath, 'utf8');

const oldLoginResponse = `export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    roles: string[];
    permissions: string[];
    mustChangePassword?: boolean;
  };
}`;

const newLoginResponse = `export interface LoginUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: LoginUser;
  requiresTwoFactor?: boolean;
  totpToken?: string;
}

export interface TwoFactorSetupResponse {
  otpauth: string;
  qrDataUrl: string;
  secret: string;
}

export interface TwoFactorEnableResponse {
  success: boolean;
  recoveryCodes: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  enabledAt: string | null;
}

export interface TwoFactorVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}`;

if (types.includes(oldLoginResponse)) {
  types = types.replace(oldLoginResponse, newLoginResponse);
  fs.writeFileSync(typesPath, types, 'utf8');
  console.log('OK LoginResponse + 2FA types');
} else {
  console.log('WARN: LoginResponse pattern not found (may already be updated)');
}

// ═══════════════════════════════════════
// 2) auth.store.ts — fix setAuth bug
// ═══════════════════════════════════════
console.log('--- auth.store.ts ---');
const storePath = FE + '\\store\\auth.store.ts';
backup(storePath);
let store = fs.readFileSync(storePath, 'utf8');

// fix bug: setAuth missing token
const oldSetAuth = `      setAuth: (token, user, refreshToken) =>
        set((s) => ({
          user,
          refreshToken: refreshToken ?? s.refreshToken,
          isAuthenticated: true,
        })),`;

const newSetAuth = `      setAuth: (token, user, refreshToken) =>
        set((s) => ({
          token,
          user,
          refreshToken: refreshToken ?? s.refreshToken,
          isAuthenticated: true,
        })),`;

if (store.includes(oldSetAuth)) {
  store = store.replace(oldSetAuth, newSetAuth);
  fs.writeFileSync(storePath, store, 'utf8');
  console.log('OK setAuth bug fixed (token now saved)');
} else {
  console.log('WARN: setAuth pattern not found');
}

// ═══════════════════════════════════════
// 3) auth.api.ts — fix refresh + add 2FA methods
// ═══════════════════════════════════════
console.log('--- auth.api.ts ---');
const apiPath = FE + '\\modules\\auth\\services\\auth.api.ts';
backup(apiPath);

const newApi = `import { api } from '@/services/api';
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
};
`;

fs.writeFileSync(apiPath, newApi, 'utf8');
console.log('OK auth.api.ts rewritten with 2FA methods');

console.log('=== DONE 6.4a ===');