import { api } from '@/services/api';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  parent?: { id: string; code: string; name: string } | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: CostCenter[];
  _count?: { children?: number; journalLines?: number };
}

export interface CostCenterInput {
  name: string;
  description?: string | null;
  parentId?: string | null;
  projectId?: string | null;
  isActive?: boolean;
}

export interface ProjectRef { id: string; code: string; name: string; }

export const costCentersApi = {
  list: async (params?: { projectId?: string; active?: boolean; parentId?: string }) => {
    const { data } = await api.get<CostCenter[]>('/cost-centers', { params });
    return data;
  },
  tree: async () => {
    const { data } = await api.get<CostCenter[]>('/cost-centers/tree');
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<CostCenter>('/cost-centers/' + id);
    return data;
  },
  create: async (payload: CostCenterInput) => {
    const { data } = await api.post<CostCenter>('/cost-centers', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CostCenterInput>) => {
    const { data } = await api.patch<CostCenter>('/cost-centers/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    await api.delete('/cost-centers/' + id);
  },
  projects: async (): Promise<ProjectRef[]> => {
    const { data } = await api.get<ProjectRef[]>('/projects');
    return data;
  },
};