import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'src', 'shared', 'prisma', 'soft-delete.middleware.ts');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-names-' + ts);
console.log('✅ بکاپ');

// محتوای جدید با PascalCase
const content = `/**
 * Prisma Soft-Delete Middleware
 *
 * ⚠️ نکته: \`params.model\` توی Prisma دقیقاً اسم مدل توی schema (PascalCase).
 *    مثال: DailyReport, SalesInvoice, RFQ
 */

const SOFT_DELETE_MODELS = new Set([
  'User', 'Role', 'Partner', 'Project', 'Contract', 'Unit', 'FiscalYear',
  'JournalEntry', 'Cheque', 'PettyCashAccount', 'PettyCashRequest',
  'PurchaseRequest', 'RFQ', 'PurchaseOrder',
  'Warehouse', 'ItemCategory', 'Item', 'GoodsReceipt', 'GoodsIssue',
  'DailyReport',
  'EmployeeProfile', 'PayrollPeriod', 'PayrollRecord', 'Attendance',
  'DailyWorkLog', 'LeaveRequest', 'AdvanceRequest',
  'PartnerCapitalAccount',
  'Permit', 'Insurance', 'Guarantee', 'TechnicalDocument', 'PhaseChecklist',
  'SalesUnit', 'SalesCustomer', 'SalesContract',
  'Attachment', 'FixedAsset', 'PurchaseInvoice', 'SupplierPayment',
  'SalesInvoice', 'SalesReceipt',
  'Equipment', 'EquipmentDailyLog', 'EquipmentMaintenance',
  'PriceList', 'OverheadAllocation',
  'AdjustmentIndex', 'AdjustmentCalculation', 'MaterialPriceDiff',
  'WorkerStatement', 'WorkerStatementItem',
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
`;

fs.writeFileSync(FILE, content, 'utf8');
console.log('✅ middleware بازنویسی شد (PascalCase)');