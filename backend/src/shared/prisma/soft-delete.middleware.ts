/**
 * Prisma Soft-Delete Middleware
 *
 * ⚠️ نکته: `params.model` توی Prisma دقیقاً اسم مدل توی schema (PascalCase).
 *    مثال: DailyReport, SalesInvoice, RFQ
 */

const SOFT_DELETE_MODELS = new Set([
  'User', 'Role', 'Partner', 'Project', 'Contract', 'Unit', 'FiscalYear',
  'JournalEntry', 'Cheque', 'PettyCashAccount', 'PettyCashRequest', 'PettyCashTransaction',
  'PurchaseRequest', 'RFQ', 'PurchaseOrder',
  'Warehouse', 'ItemCategory', 'Item', 'GoodsReceipt', 'GoodsIssue',
  'DailyReport',
  'EmployeeProfile', 'PayrollPeriod', 'PayrollRecord', 'Attendance',
  'DailyWorkLog', 'LeaveRequest', 'AdvanceRequest',
  'PartnerCapitalAccount', 'PartnerCapitalContribution', 'PartnerCapitalWithdrawal', 'ProjectPartnerShare',
  'Permit', 'Insurance', 'Guarantee', 'TechnicalDocument', 'PhaseChecklist',
  'SalesUnit', 'SalesCustomer', 'SalesContract',
  'Attachment', 'FixedAsset', 'PurchaseInvoice', 'SupplierPayment',
  'SalesInvoice', 'SalesReceipt',
  'Equipment', 'EquipmentDailyLog', 'EquipmentMaintenance',
  'PriceList', 'OverheadAllocation',
  'AdjustmentIndex', 'AdjustmentCalculation', 'MaterialPriceDiff',
  'WorkerStatement', 'WorkerStatementItem',
  'SubcontractorStatement', 'SubcontractorStatementItem',
  'ClientStatement', 'ClientStatementItem',
  'Account', 'AccountMapping',
  'ProjectBudget',
]);

const READ_ACTIONS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
]);

const UNIQUE_ACTIONS = new Set(['findUnique', 'findUniqueOrThrow']);

export async function softDeleteMiddleware(params: any, next: any) {
  // ۱. Bypass
  if ((globalThis as any).__BYPASS_SOFT_DELETE) {
    return next(params);
  }

  // ۱.۵. پشتیبانی از flag قدیمی `__withDeleted` (backward compat)
  // اگه true → bypass کامل (ببین همه رکوردها)
  // اگه false یا undefined → عادی
  if (params.args && '__withDeleted' in params.args) {
    const withDeleted = params.args.__withDeleted;
    // strip کن که Prisma نبینه
    delete params.args.__withDeleted;
    if (withDeleted === true) {
      return next(params);
    }
  }

  // ۲. اگه model تو لیست نیست، skip
  if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
    return next(params);
  }

  // ۳. findMany/findFirst/count/... → اضافه deletedAt: null
  if (READ_ACTIONS.has(params.action)) {
    params.args = params.args || {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
    return next(params);
  }

  // ۴. findUnique → تبدیل به findFirst
  if (UNIQUE_ACTIONS.has(params.action)) {
    params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
    params.args = params.args || {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
    return next(params);
  }

  // ۵. سایر actions (create/update/delete) → دست نخورده
  return next(params);
}
