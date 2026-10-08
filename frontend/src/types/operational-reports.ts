export interface EquipmentEfficiencyItem {
  equipmentId: string;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  ownership: string;
  fuelType?: string | null;
  hourlyRate: number;
  fuelNormPerHour: number;
  totalWorkHours: number;
  totalIdleHours: number;
  totalStopHours: number;
  totalBreakdownHours: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  totalComputedCost: number;
  logCount: number;
  projects: string;
  fuelPerHour: number;
  normDiffPct: number;
  fuelCompliance: string;
  availabilityRate: number;
  avgHourlyCost: number;
}

export interface EquipmentEfficiencyReport {
  period: { from: string; to: string };
  items: EquipmentEfficiencyItem[];
  totals: {
    totalEquipments: number;
    totalWorkHours: number;
    totalIdleHours: number;
    totalStopHours: number;
    totalBreakdownHours: number;
    totalFuelLiters: number;
    totalFuelCost: number;
    totalCost: number;
    totalLogs: number;
  };
}

export interface SubcontractorPerformanceItem {
  contractorId: string;
  code: string;
  name: string;
  nationalId?: string | null;
  phone?: string | null;
  statementCount: number;
  approvedCount: number;
  paidCount: number;
  draftCount: number;
  totalAmount: number;
  totalDeduction: number;
  netPayable: number;
  paidAmount: number;
  unpaidAmount: number;
  projects: string;
}

export interface SubcontractorPerformanceReport {
  period: { from?: string; to?: string };
  items: SubcontractorPerformanceItem[];
  totals: {
    totalContractors: number;
    totalStatements: number;
    totalAmount: number;
    totalDeduction: number;
    totalNetPayable: number;
    totalPaid: number;
    totalUnpaid: number;
  };
}

export interface WarehouseDiscrepancyRow {
  countId: string;
  countCode: string;
  countDate: string;
  warehouseId?: string;
  warehouseName?: string;
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  unit?: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  unitCost: number;
  differenceCost: number;
  notes?: string | null;
}

export interface WarehouseDiscrepancyItemSummary {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  unit?: string;
  countOccurrences: number;
  totalQtyDiff: number;
  totalCostDiff: number;
  positiveDiffCount: number;
  negativeDiffCount: number;
}

export interface WarehouseDiscrepancyReport {
  period: { from: string; to: string };
  rows: WarehouseDiscrepancyRow[];
  itemSummary: WarehouseDiscrepancyItemSummary[];
  totals: {
    totalCounts: number;
    totalRows: number;
    totalQtyDiff: number;
    totalCostDiff: number;
    positiveCostDiff: number;
    negativeCostDiff: number;
    uniqueItems: number;
  };
}
