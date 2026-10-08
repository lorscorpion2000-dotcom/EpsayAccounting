import { api } from '@/services/api';

export interface AccountMapping {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  debitAccount?: { id: string; code: string; name: string } | null;
  creditAccount?: { id: string; code: string; name: string } | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountMappingInput {
  code: string;
  title: string;
  description?: string | null;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  isActive?: boolean;
}

export interface PostableAccount {
  id: string;
  code: string;
  name: string;
}

export const mappingsApi = {
  list: async (): Promise<AccountMapping[]> => {
    const { data } = await api.get<AccountMapping[]>('/accounting/mappings');
    return data;
  },
  get: async (id: string): Promise<AccountMapping> => {
    const { data } = await api.get<AccountMapping>('/accounting/mappings/' + id);
    return data;
  },
  create: async (payload: AccountMappingInput): Promise<AccountMapping> => {
    const { data } = await api.post<AccountMapping>('/accounting/mappings', payload);
    return data;
  },
  update: async (id: string, payload: Partial<AccountMappingInput>): Promise<AccountMapping> => {
    const { data } = await api.patch<AccountMapping>('/accounting/mappings/' + id, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete('/accounting/mappings/' + id);
  },
  postableAccounts: async (): Promise<PostableAccount[]> => {
    const { data } = await api.get<PostableAccount[]>('/accounts/postable');
    return data;
  },
};