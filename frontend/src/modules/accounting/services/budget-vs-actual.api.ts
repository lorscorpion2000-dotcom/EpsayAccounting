import { api } from '@/services/api';

export interface BudgetLine {
  id: string;
  projectId: string;
  wbsItemId: string | null;
  wbsCode: string | null;
  wbsTitle: string | null;
  wbsLevel: string | null;
  amount: number;
  approvedAt: string;
  isLocked: boolean;
  description: string | null;
}

export interface ActualLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  actual: number;
  count: number;
}

export interface BudgetVsActualReport {
  project: { id: string; code: string; name: string };
  from: string;
  to: string;
  summary: {
    totalBudget: number;
    totalActual: number;
    variance: number;
    percentUsed: number;
  };
  budgetLines: BudgetLine[];
  actualByAccount: ActualLine[];
  totalsByLevel: Array<{ level: string; budget: number }>;
}

export interface ProjectRef { id: string; code: string; name: string; }

export const budgetVsActualApi = {
  get: async (projectId: string, from: string, to: string) => {
    const { data } = await api.get<BudgetVsActualReport>('/reports/budget-vs-actual', {
      params: { projectId, from, to },
    });
    return data;
  },
  projects: async (): Promise<ProjectRef[]> => {
    const { data } = await api.get<ProjectRef[]>('/projects');
    return data;
  },
};