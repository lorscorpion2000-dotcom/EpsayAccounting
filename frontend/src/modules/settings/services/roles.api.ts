import { api } from '@/services/api';

export interface SystemPermission {
  id: string;
  code: string;
  displayName: string;
  module: string;
  action: string;
}

export interface SystemRole {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  isSystem?: boolean;
  permissions?: SystemPermission[];
}

export const rolesApi = {
  list: async (): Promise<SystemRole[]> => {
    const { data } = await api.get<SystemRole[]>('/roles');
    return data;
  },
  get: async (id: string): Promise<SystemRole> => {
    const { data } = await api.get<SystemRole>('/roles/' + id);
    return data;
  },
  create: async (payload: any): Promise<SystemRole> => {
    const { data } = await api.post<SystemRole>('/roles', payload);
    return data;
  },
  update: async (id: string, payload: any): Promise<SystemRole> => {
    const { data } = await api.patch<SystemRole>('/roles/' + id, payload);
    return data;
  },
  assignPermissions: async (id: string, permissionIds: string[]): Promise<SystemRole> => {
    const { data } = await api.patch<SystemRole>('/roles/' + id + '/permissions', { permissionIds });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/roles/' + id);
  },
};

export const permissionsApi = {
  list: async (): Promise<SystemPermission[]> => {
    const res: any = await api.get('/permissions');
    const d = res?.data;
    if (Array.isArray(d)) return d;
    // اگر grouped object بود
    if (d && typeof d === 'object') {
      return Object.values(d).flat() as SystemPermission[];
    }
    return [];
  },
};
