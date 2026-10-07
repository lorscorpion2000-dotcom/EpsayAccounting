import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user, refreshToken) =>
        set((s) => ({
          token,
          user,
          refreshToken: refreshToken ?? s.refreshToken,
          isAuthenticated: true,
        })),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () =>
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),
      hasPermission: (code) => {
        const u = get().user;
        if (!u) return false;
        if (u.roles.includes('super_admin')) return true;
        return u.permissions.includes(code);
      },
      hasAnyPermission: (...codes) => {
        const u = get().user;
        if (!u) return false;
        if (u.roles.includes('super_admin')) return true;
        return codes.some((c) => u.permissions.includes(c));
      },
    }),
    { name: 'epsay-auth' },
  ),
);