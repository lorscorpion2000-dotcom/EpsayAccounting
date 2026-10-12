import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/auth.store';

function reset() {
  try { localStorage.clear(); } catch {}
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
}

beforeEach(reset);

describe('auth.store', () => {
  it('hasPermission returns false when no user', () => {
    expect(useAuthStore.getState().hasPermission('X')).toBe(false);
  });

  it('hasPermission: super_admin bypasses all checks', () => {
    useAuthStore.getState().setAuth('t', {
      id: '1', username: 'a', fullName: 'A',
      roles: ['super_admin'], permissions: [],
    });
    expect(useAuthStore.getState().hasPermission('ANY')).toBe(true);
  });

  it('hasPermission: checks permissions list', () => {
    useAuthStore.getState().setAuth('t', {
      id: '1', username: 'a', fullName: 'A',
      roles: ['user'], permissions: ['X', 'Y'],
    });
    expect(useAuthStore.getState().hasPermission('X')).toBe(true);
    expect(useAuthStore.getState().hasPermission('Z')).toBe(false);
  });

  it('hasAnyPermission: true when at least one matches', () => {
    useAuthStore.getState().setAuth('t', {
      id: '1', username: 'a', fullName: 'A',
      roles: ['user'], permissions: ['Y'],
    });
    expect(useAuthStore.getState().hasAnyPermission('X', 'Y')).toBe(true);
    expect(useAuthStore.getState().hasAnyPermission('X', 'Z')).toBe(false);
  });

  it('logout clears token/user/isAuthenticated', () => {
    useAuthStore.getState().setAuth('t', {
      id: '1', username: 'a', fullName: 'A', roles: [], permissions: [],
    });
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('setTokens updates token and refreshToken', () => {
    useAuthStore.getState().setTokens('access-x', 'refresh-y');
    const s = useAuthStore.getState();
    expect(s.token).toBe('access-x');
    expect(s.refreshToken).toBe('refresh-y');
  });
});
