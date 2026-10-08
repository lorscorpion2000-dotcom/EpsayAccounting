export interface DashboardExecutive {
  kpi: {
    activeProjects: number;
    activeContracts: number;
    totalContractValue: number;
    ytdRevenue: number;
    ytdCost: number;
    ytdProfit: number;
    cashOnHand: number;
    receivables: number;
    payables: number;
    netWorkingCapital: number;
  };
  pendingApprovals: {
    dailyReports: number;
    purchaseRequests: number;
    statements: number;
    total: number;
  };
  projects: { id: string; code: string; name: string; status: string; contractAmount: number }[];
  monthlyTrend: { month: string; revenue: number; cost: number; profit: number }[];
  chequeAlerts: { id: string; code: string; partner: string; amount: number; dueDate: string; direction: string }[];
  guaranteeAlerts: { id: string; code: string; title: string; amount: number; expiryDate: string }[];
  insuranceAlerts: { id: string; code: string; title: string; insurer?: string | null; expiryDate: string }[];
  cashFlowForecast: {
    d30: { days: number; from: string; to: string; inflow: number; outflow: number; net: number };
    d60: { days: number; from: string; to: string; inflow: number; outflow: number; net: number };
    d90: { days: number; from: string; to: string; inflow: number; outflow: number; net: number };
  };
}
