import { api } from '@/services/api';

export interface PendingApproval {
  id: string;
  module: string;
  type: string;
  code: string;
  title: string;
  description: string;
  amount: string | number;
  date: string;
  status: string;
  requester: string;
  accountName?: string;
  accountCode?: string;
  projectName?: string | null;
  projectCode?: string;
  recipient?: string | null;
  category?: string | null;
  invoiceNumber?: string | null;
  currentBalance?: string | number;
  iban?: string | null;
  itemCount?: number;
  supplierName?: string;
  department?: string | null;
  deliveryLocation?: string | null;
  createdAt: string;
  raw: any;
}

export interface PendingApprovalsResponse {
  pettyCashTransactions: PendingApproval[];
  pettyCashRequests: PendingApproval[];
  purchaseRequests: PendingApproval[];
  purchaseOrders: PendingApproval[];
}

export interface ApprovalStats {
  total: number;
  byModule: {
    pettyCashTransactions: { count: number; amount: number };
    pettyCashRequests: { count: number; amount: number };
    purchaseRequests: { count: number; amount: number };
    purchaseOrders: { count: number; amount: number };
  };
}

export const approvalsApi = {
  getPending: async () => {
    const { data } = await api.get<PendingApprovalsResponse>('/approvals/pending');
    return data;
  },
  getStats: async () => {
    const { data } = await api.get<ApprovalStats>('/approvals/stats');
    return data;
  },
  approve: async (module: string, id: string, note?: string) => {
    const { data } = await api.post('/approvals/approve', { module, id, note });
    return data;
  },
  reject: async (module: string, id: string, reason: string) => {
    const { data } = await api.post('/approvals/reject', { module, id, reason });
    return data;
  },
  pettyCashPay: async (id: string, sourceAccountId: string) => {
    const { data } = await api.patch('/petty-cash/requests/' + id + '/pay', { sourceAccountId });
    return data;
  },
};
