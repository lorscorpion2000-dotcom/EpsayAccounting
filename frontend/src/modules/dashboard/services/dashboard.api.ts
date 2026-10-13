import { api } from '@/services/api';

export interface DashboardKpis {
  activeProjects: number;
  totalUsers: number;
  totalPartners: number;
  totalItems: number;
  pettyCashBalance: number;
  pendingApprovals: number;
  lowStockItems: number;
}

export interface CashFlowData {
  pettyCash: number;
  bank: number;
  cash: number;
  total: number;
  accounts: { code: string; name: string; balance: number }[];
}

export interface ProjectProgress {
  id: string;
  code: string;
  name: string;
  status: string;
  physicalProgress: number;
  financialProgress: number;
  totalBudget: number;
  totalSpent: number;
}

export interface AlertsData {
  overBudget: {
    id: string;
    code: string;
    name: string;
    budget: number;
    spent: number;
    deviation: number;
    deviationPercent: number;
  }[];
  pendingApprovals: {
    pettyCashTransactions: number;
    pettyCashRequests: number;
    purchaseRequests: number;
    purchaseOrders: number;
    dailyReports: number;
    goodsReceipts: number;
    subcontractorStatements: number;
    clientStatements: number;
    workerStatements: number;
    leaveRequests: number;
    advanceRequests: number;
    total: number;
  };
  criticalStock: {
    itemCode: string;
    itemName: string;
    warehouse: string;
    currentQty: number;
    reorderPoint: number;
  }[];
  recentActivities: {
    type: string;
    title: string;
    description: string;
    code: string;
    date: string;
    amount: number;
  }[];
}

export interface ProfitLossData {
  revenues: number;
  expenses: number;
  profit: number;
  revenueDetails: { code: string; name: string; nature: string; amount: number }[];
  expenseDetails: { code: string; name: string; nature: string; amount: number }[];
}

export const dashboardApi = {
  kpis: async (): Promise<DashboardKpis> => {
    const { data } = await api.get<DashboardKpis>('/dashboard/kpis');
    return data;
  },
  cashFlow: async (): Promise<CashFlowData> => {
    const { data } = await api.get<CashFlowData>('/dashboard/cash-flow');
    return data;
  },
  projectsProgress: async (): Promise<ProjectProgress[]> => {
    const { data } = await api.get<ProjectProgress[]>('/dashboard/projects-progress');
    return data;
  },
  alerts: async (): Promise<AlertsData> => {
    const { data } = await api.get<AlertsData>('/dashboard/alerts');
    return data;
  },
  profitLoss: async (): Promise<ProfitLossData> => {
    const { data } = await api.get<ProfitLossData>('/dashboard/profit-loss');
    return data;
  },
};
