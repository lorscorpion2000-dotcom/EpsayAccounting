/**
 * Prisma Soft-Delete Middleware
 *
 * به‌صورت خودکار همه کوئری‌های خواندن (findMany, findFirst, count, ...) رو
 * فیلتر می‌کنه تا رکوردهای soft-deleted نمایش داده نشن.
 *
 * ⚠️ Bypass: برای listDeleted و restore
 *    (globalThis as any).__BYPASS_SOFT_DELETE = true;
 */

// ⚠️ مدل‌های دارای deletedAt
const SOFT_DELETE_MODELS = [
  'user', 'role', 'partner', 'project', 'contract', 'unit', 'fiscalYear',
  'journalEntry', 'cheque', 'pettyCashAccount', 'pettyCashRequest',
  'purchaseRequest', 'rFQ', 'purchaseOrder',
  'warehouse', 'itemCategory', 'item', 'goodsReceipt', 'goodsIssue',
  'dailyReport',
  'employeeProfile', 'payrollPeriod', 'payrollRecord', 'attendance',
  'dailyWorkLog', 'leaveRequest', 'advanceRequest',
  'partnerCapitalAccount',
  'permit', 'insurance', 'guarantee', 'technicalDocument', 'phaseChecklist',
  'salesUnit', 'salesCustomer', 'salesContract',
  'attachment', 'fixedAsset', 'purchaseInvoice', 'supplierPayment',
  'salesInvoice', 'salesReceipt',
  'equipment', 'equipmentDailyLog', 'equipmentMaintenance',
  'priceList', 'overheadAllocation',
  'adjustmentIndex', 'adjustmentCalculation', 'materialPriceDiff',
  'workerStatement', 'workerStatementItem',
];

const READ_ACTIONS = [
  'findMany', 'findFirst', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
];

const UNIQUE_ACTIONS = ['findUnique', 'findUniqueOrThrow'];

export async function softDeleteMiddleware(params: any, next: any) {
  // ۱. Bypass برای listDeleted و restore
  if ((globalThis as any).__BYPASS_SOFT_DELETE) {
    return next(params);
  }

  // ۲. اگه model تو لیست soft-delete نیست، skip
  const model = params.model;
  if (!model) return next(params);

  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  if (!SOFT_DELETE_MODELS.includes(modelKey)) {
    return next(params);
  }

  // ۳. findMany/findFirst/count/aggregate/groupBy → اضافه deletedAt: null
  if (READ_ACTIONS.includes(params.action)) {
    params.args = params.args || {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
    return next(params);
  }

  // ۴. findUnique → تبدیل به findFirst با فیلتر
  if (UNIQUE_ACTIONS.includes(params.action)) {
    params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
    params.args = params.args || {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
    return next(params);
  }

  // ۵. update/delete → اجازه بده (soft-delete از SoftDeleteService)
  return next(params);
}