import { api } from '@/services/api';

export interface BankAccount {
  id: string;
  code: string;
  name: string;
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  shabaNumber?: string | null;
  description?: string | null;
  isActive: boolean;
  glAccountId?: string | null;
  glAccount?: { id: string; code: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { cheques?: number };
}

export interface BankAccountInput {
  name: string;
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  shabaNumber?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export const bankAccountsApi = {
  list: async (params?: { active?: boolean }) => {
    const { data } = await api.get<BankAccount[]>('/bank-accounts', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<BankAccount>('/bank-accounts/' + id);
    return data;
  },
  create: async (payload: BankAccountInput) => {
    const { data } = await api.post<BankAccount>('/bank-accounts', payload);
    return data;
  },
  update: async (id: string, payload: Partial<BankAccountInput>) => {
    const { data } = await api.patch<BankAccount>('/bank-accounts/' + id, payload);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete('/bank-accounts/' + id);
    return data;
  },
};