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
  dailyReports: PendingApproval[];
  goodsReceipts: PendingApproval[];
  subcontractorStatements: PendingApproval[];
  leaveRequests: PendingApproval[];
  advanceRequests: PendingApproval[];
  clientStatements: PendingApproval[];
  workerStatements: PendingApproval[];
  expenses: PendingApproval[];
}

export interface ApprovalStats {
  total: number;
  byModule: {
    pettyCashTransactions: { count: number; amount: number };
    pettyCashRequests: { count: number; amount: number };
    purchaseRequests: { count: number; amount: number };
    purchaseOrders: { count: number; amount: number };
    dailyReports?: { count: number; amount: number };
    goodsReceipts?: { count: number; amount: number };
    subcontractorStatements?: { count: number; amount: number };
    leaveRequests?: { count: number; amount: number };
    advanceRequests?: { count: number; amount: number };
    clientStatements?: { count: number; amount: number };
    workerStatements?: { count: number; amount: number };
    expenses?: { count: number; amount: number };
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
  approve: async (module: string, id: string, note?: string, force?: boolean) => {
    const { data } = await api.post('/approvals/approve', { module, id, note, force });
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
