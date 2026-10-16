import { api } from '@/services/api';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  isActive: boolean;
  isStaff?: boolean;
  defaultProjectId?: string | null;
  roles: { id: string; code: string; displayName: string }[];
}

export interface SystemRole {
  id: string;
  code: string;
  displayName: string;
  description?: string;
}
export interface AssignedProject {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
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
  listProjects: async (userId: string): Promise<AssignedProject[]> => {
    const { data } = await api.get<AssignedProject[]>('/users/' + userId + '/projects');
    return data;
  },
  assignProject: async (userId: string, projectId: string): Promise<void> => {
    await api.post('/users/' + userId + '/projects', { projectId });
  },
  unassignProject: async (userId: string, projectId: string): Promise<void> => {
    await api.delete('/users/' + userId + '/projects/' + projectId);
  },
  setDefaultProject: async (userId: string, projectId: string | null): Promise<void> => {
    await api.patch('/users/' + userId + '/default-project', { projectId });
  },
  roles: async (): Promise<SystemRole[]> => {
    const { data } = await api.get<SystemRole[]>('/roles');
    return data;
  },
};
