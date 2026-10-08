import { api } from '@/services/api';

export type ChequeDirection = 'ISSUED' | 'RECEIVED';
export type ChequeStatus = 'PENDING' | 'PASSED' | 'RETURNED' | 'CANCELLED';

export interface Cheque {
  id: string;
  code: string;
  serial: string;
  direction: ChequeDirection;
  status: ChequeStatus;
  amount: number;
  issueDate: string;
  dueDate: string;
  description?: string | null;
  bankAccountId?: string | null;
  bankAccount?: { id: string; code: string; name: string } | null;
  partnerId?: string | null;
  partner?: { id: string; code: string; name: string } | null;
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  issuedJournalEntryId?: string | null;
  settledJournalEntryId?: string | null;
  issuedJournalEntry?: { id: string; code: string; status: string } | null;
  settledJournalEntry?: { id: string; code: string; status: string } | null;
  passedAt?: string | null;
  returnedAt?: string | null;
  cancelledAt?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChequeInput {
  direction: ChequeDirection;
  serial: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  description?: string | null;
  bankAccountId?: string | null;
  partnerId?: string | null;
  projectId?: string | null;
}

export interface ChequeListQuery {
  direction?: string;
  status?: string;
  partnerId?: string;
  bankAccountId?: string;
  fromDueDate?: string;
  toDueDate?: string;
}

export const chequesApi = {
  list: async (params?: ChequeListQuery) => {
    const { data } = await api.get<Cheque[]>('/cheques', { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<Cheque>('/cheques/' + id);
    return data;
  },
  create: async (payload: ChequeInput) => {
    const { data } = await api.post<Cheque>('/cheques', payload);
    return data;
  },
  update: async (id: string, payload: Partial<ChequeInput>) => {
    const { data } = await api.patch<Cheque>('/cheques/' + id, payload);
    return data;
  },
  remove: async (id: string, force?: boolean) => {
    const { data } = await api.delete('/cheques/' + id + (force ? '?force=true' : ''));
    return data;
  },
  pass: async (id: string, note?: string) => {
    const { data } = await api.patch<Cheque>('/cheques/' + id + '/pass', { note });
    return data;
  },
  return_: async (id: string, note?: string) => {
    const { data } = await api.patch<Cheque>('/cheques/' + id + '/return', { note });
    return data;
  },
  cancel: async (id: string, note?: string) => {
    const { data } = await api.patch<Cheque>('/cheques/' + id + '/cancel', { note });
    return data;
  },
};