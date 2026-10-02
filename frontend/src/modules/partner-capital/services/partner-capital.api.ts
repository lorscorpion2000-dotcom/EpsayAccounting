import { api } from '@/services/api';

export interface CapitalAccount {
  id: string;
  code: string;
  partnerId: string;
  partner: { id: string; code: string; name: string; type: string };
  projectId?: string | null;
  project?: { id: string; code: string; name: string } | null;
  balance: string;
  isActive: boolean;
  notes?: string | null;
  _count?: { contributions: number; withdrawals: number };
  createdAt: string;
}

export interface Contribution {
  id: string;
  code: string;
  accountId: string;
  account: { id: string; code: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  projectId?: string | null;
  type: 'CASH' | 'NON_CASH';
  category: string;
  amount: string;
  currency: string;
  contributionDate: string;
  description?: string | null;
  valuationNotes?: string | null;
  referenceCode?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  code: string;
  accountId: string;
  account: { id: string; code: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  projectId?: string | null;
  amount: string;
  withdrawalDate: string;
  reason?: string | null;
  targetProjectId?: string | null;
  transferToContribution: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  approvedAt?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface PartnerShare {
  id: string;
  projectId: string;
  project: { id: string; code: string; name: string };
  partnerId: string;
  partner: { id: string; code: string; name: string };
  sharePercent: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface BalanceSheet {
  accounts: {
    id: string; code: string;
    partnerName: string; partnerCode: string;
    projectName: string; projectCode: string;
    balance: number;
  }[];
  totals: { contributions: number; withdrawals: number; net: number };
}

export interface PartnerStatement {
  partner: any;
  summary: { totalContributions: number; totalWithdrawals: number; netBalance: number };
  contributions: Contribution[];
  withdrawals: Withdrawal[];
  accounts: { id: string; code: string; projectName: string; balance: number }[];
  shares: { projectName: string; sharePercent: number; effectiveFrom: string; effectiveTo?: string | null }[];
}

export const partnerCapitalApi = {
  accounts: {
    list: async (params?: { partnerId?: string; projectId?: string }) => {
      const { data } = await api.get<CapitalAccount[]>('/partner-capital/accounts', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<CapitalAccount>('/partner-capital/accounts/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<CapitalAccount>('/partner-capital/accounts', payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/accounts/' + id);
      return data;
    },
  },

  contributions: {
    list: async (params?: { partnerId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<Contribution[]>('/partner-capital/contributions', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Contribution>('/partner-capital/contributions/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Contribution>('/partner-capital/contributions', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Contribution>('/partner-capital/contributions/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/contributions/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/partner-capital/contributions/' + id + '/reject', { reason });
      return data;
    },
  },

  withdrawals: {
    list: async (params?: { partnerId?: string; projectId?: string; status?: string }) => {
      const { data } = await api.get<Withdrawal[]>('/partner-capital/withdrawals', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Withdrawal>('/partner-capital/withdrawals/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Withdrawal>('/partner-capital/withdrawals', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Withdrawal>('/partner-capital/withdrawals/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/withdrawals/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/partner-capital/withdrawals/' + id + '/reject', { reason });
      return data;
    },
  },

  shares: {
    list: async (params?: { projectId?: string; partnerId?: string }) => {
      const { data } = await api.get<PartnerShare[]>('/partner-capital/shares', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PartnerShare>('/partner-capital/shares/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PartnerShare>('/partner-capital/shares', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<PartnerShare>('/partner-capital/shares/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/partner-capital/shares/' + id);
      return data;
    },
  },

  reports: {
    balanceSheet: async () => {
      const { data } = await api.get<BalanceSheet>('/partner-capital/reports/balance-sheet');
      return data;
    },
    partnerStatement: async (partnerId: string) => {
      const { data } = await api.get<PartnerStatement>(
        '/partner-capital/reports/partner-statement/' + partnerId,
      );
      return data;
    },
  },
};
