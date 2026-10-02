import { api } from '@/services/api';
import type {
  PettyCashAccount, PettyCashTransaction, PettyCashRequest,
} from '@/types/petty-cash';

export const pettyCashApi = {
  // ===== Accounts =====
  accounts: {
    list: async (params?: { holderId?: string; projectId?: string; active?: boolean }) => {
      const { data } = await api.get<PettyCashAccount[]>('/petty-cash/accounts', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PettyCashAccount>('/petty-cash/accounts/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PettyCashAccount>('/petty-cash/accounts', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PettyCashAccount>('/petty-cash/accounts/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/petty-cash/accounts/' + id);
      return data;
    },
  },

  // ===== Transactions =====
  transactions: {
    list: async (params?: {
      accountId?: string;
      type?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const { data } = await api.get<PettyCashTransaction[]>('/petty-cash/transactions', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PettyCashTransaction>('/petty-cash/transactions/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PettyCashTransaction>('/petty-cash/transactions', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PettyCashTransaction>('/petty-cash/transactions/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/petty-cash/transactions/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/petty-cash/transactions/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/petty-cash/transactions/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/petty-cash/transactions/' + id + '/reject', { reason });
      return data;
    },
  },

  // ===== Requests =====
  requests: {
    list: async (params?: { accountId?: string; status?: string }) => {
      const { data } = await api.get<PettyCashRequest[]>('/petty-cash/requests', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PettyCashRequest>('/petty-cash/requests/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PettyCashRequest>('/petty-cash/requests', payload);
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/petty-cash/requests/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/petty-cash/requests/' + id + '/reject', { reason });
      return data;
    },
    pay: async (id: string) => {
      const { data } = await api.patch('/petty-cash/requests/' + id + '/pay');
      return data;
    },
  },
};
