import { api } from '@/services/api';
import type {
  Project, Contract, WbsItem, ProjectBudget, Partner,
} from '@/types/project';

export const projectsApi = {
  // Projects
  list: async (params?: { status?: string; search?: string }) => {
    const { data } = await api.get<Project[]>('/projects', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<Project>('/projects/' + id);
    return data;
  },
  create: async (payload: Partial<Project>) => {
    const { data } = await api.post<Project>('/projects', payload);
    return data;
  },
  update: async (id: string, payload: Partial<Project>) => {
    const { data } = await api.patch<Project>('/projects/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/projects/' + id);
    return data;
  },

  // Contracts
  contracts: {
    list: async (projectId?: string) => {
      const { data } = await api.get<Contract[]>('/project-contracts', {
        params: projectId ? { projectId } : {},
      });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Contract>('/project-contracts/' + id);
      return data;
    },
    create: async (payload: Partial<Contract>) => {
      const { data } = await api.post<Contract>('/project-contracts', payload);
      return data;
    },
    update: async (id: string, payload: Partial<Contract>) => {
      const { data } = await api.patch<Contract>('/project-contracts/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/project-contracts/' + id);
      return data;
    },
  },

  // WBS
  wbs: {
    tree: async (projectId: string) => {
      const { data } = await api.get<WbsItem[]>('/wbs', { params: { projectId } });
      return data;
    },
    create: async (payload: Partial<WbsItem> & { projectId: string; level: string; title: string }) => {
      const { data } = await api.post<WbsItem>('/wbs', payload);
      return data;
    },
    update: async (id: string, payload: Partial<WbsItem>) => {
      const { data } = await api.patch<WbsItem>('/wbs/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/wbs/' + id);
      return data;
    },
  },

  // Budgets
  budgets: {
    list: async (projectId?: string) => {
      const { data } = await api.get<ProjectBudget[]>('/budgets', {
        params: projectId ? { projectId } : {},
      });
      return data;
    },
    create: async (payload: Partial<ProjectBudget>) => {
      const { data } = await api.post<ProjectBudget>('/budgets', payload);
      return data;
    },
    update: async (id: string, payload: Partial<ProjectBudget>) => {
      const { data } = await api.patch<ProjectBudget>('/budgets/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/budgets/' + id);
      return data;
    },
  },

  // Partners (برای نمایش لیست مشتریان در فرم)
  partners: {
    list: async (type?: string) => {
      const { data } = await api.get<Partner[]>('/partners', {
        params: type ? { type } : {},
      });
      return data;
    },
  },
};
