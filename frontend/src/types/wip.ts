export interface WipProject {
  project: { id: string; code: string; name: string; status: string };
  contract: { id: string; code: string; amount: number; coefficient: number } | null;
  realCost: number;
  bookedRevenue: number;
  contractAmount: number;
  progressPct: number;
  financialPct: number;
  recognizedRevenue: number;
  billedAmount: number;
  wip: number;
  profit: number;
  wbsCount: number;
  progressCount: number;
}

export interface WipOverview {
  rows: WipProject[];
  totals: {
    realCost: number;
    bookedRevenue: number;
    recognizedRevenue: number;
    billedAmount: number;
    wip: number;
    profit: number;
    contractAmount: number;
  };
}

export interface SCurvePoint {
  month: string;
  physicalPct: number;
  financialPct: number;
  physicalCum: number;
  financialCum: number;
}

export interface SCurveData {
  project: { id: string; code: string; name: string; startDate: string | null; plannedEndDate: string | null };
  contractAmount: number;
  points: SCurvePoint[];
}
