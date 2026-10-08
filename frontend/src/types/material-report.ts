export interface ConsumptionRow {
  id: string;
  date: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warehouseName: string;
  projectId: string | null;
  projectCode: string;
  projectName: string;
  wbsItemId: string | null;
  wbsCode: string;
  wbsTitle: string;
  description: string | null;
  referenceCode: string | null;
}

export interface ConsumptionByItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  totalQuantity: number;
  totalCost: number;
  count: number;
}

export interface ConsumptionByProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  totalCost: number;
  count: number;
}

export interface ConsumptionResult {
  summary: { totalRows: number; totalCost: number; uniqueItems: number };
  byItem: ConsumptionByItem[];
  byProject: ConsumptionByProject[];
  rows: ConsumptionRow[];
}

export interface WbsUnitCostRow {
  wbsId: string;
  wbsCode: string;
  wbsTitle: string;
  level: string;
  unit: string | null;
  quantity: number;
  contractUnitPrice: number;
  contractTotalPrice: number;
  materialCost: number;
  subCost: number;
  equipmentCost: number;
  overheadShare: number;
  totalCost: number;
  unitCost: number;
  deviation: number;
  deviationPct: number;
}

export interface WbsUnitCostResult {
  project: { id: string; code: string; name: string };
  rows: WbsUnitCostRow[];
  totals: {
    materialCost: number;
    subCost: number;
    equipmentCost: number;
    overheadShare: number;
    totalCost: number;
    contractTotalPrice: number;
    profit: number;
    profitPct: number;
  };
}
