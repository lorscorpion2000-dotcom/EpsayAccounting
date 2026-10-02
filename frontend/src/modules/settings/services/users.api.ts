import { api } from '@/services/api';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  isActive: boolean;
  roles: { id: string; code: string; displayName: string }[];
}

export interface SystemRole {
  id: string;
  code: string;
  displayName: string;
  description?: string;
}

export const usersApi = {
  list: async (): Promise<SystemUser[]> => {
    const { data } = await api.get<SystemUser[]>('/users');
    return data;
  },
  create: async (payload: any): Promise<SystemUser> => {
    const { data } = await api.post<SystemUser>('/users', payload);
    return data;
  },
  update: async (id: string, payload: any): Promise<SystemUser> => {
    const { data } = await api.patch<SystemUser>('/users/' + id, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/users/' + id);
  },
  roles: async (): Promise<SystemRole[]> => {
    const { data } = await api.get<SystemRole[]>('/roles');
    return data;
  },
};
