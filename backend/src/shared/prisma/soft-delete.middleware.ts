/**
 * Prisma Soft-Delete Middleware
 *
 * ⚠️ نکته: `params.model` توی Prisma دقیقاً اسم مدل توی schema (PascalCase).
 *    مثال: DailyReport, SalesInvoice, RFQ
 */

import { Prisma } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set([
  'User', 'Role', 'Partner', 'Project', 'Contract', 'LegalContract', 'LegalContractParty', 'Unit', 'FiscalYear',
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

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  // ۱. Bypass
  if ((globalThis as unknown as { __BYPASS_SOFT_DELETE?: boolean }).__BYPASS_SOFT_DELETE) {
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
  // ⚠️ نسخه‌ی اصلاح‌شده: اگر where شامل compound unique key باشد (مثل employeeId_attendanceDate)،
  //    قبل از تبدیل، flatten می‌کنیم چون findFirst این کلید را پشتیبانی نمی‌کند.
  if (UNIQUE_ACTIONS.has(params.action)) {
    const original = params.action;
    params.args = params.args || {};
    if (!params.args.where) params.args.where = {};

    // ✨ flatten compound unique
    const nonDeletedKeys = Object.keys(params.args.where).filter(k => k !== 'deletedAt');
    if (nonDeletedKeys.length === 1) {
      const key = nonDeletedKeys[0];
      const val = params.args.where[key];
      const isCompoundCandidate =
        key.includes('_') &&
        val && typeof val === 'object' &&
        !Array.isArray(val) &&
        !(val instanceof Date);

      if (isCompoundCandidate) {
        const valObj = val as Record<string, unknown>;
        const innerKeys = Object.keys(valObj);
        const parts = key.split('_');
        // Only flatten if inner keys match the split parts — confirms compound unique
        const matches = parts.length >= 2
          && parts.length === innerKeys.length
          && parts.every((p, i) => p === innerKeys[i]);
        if (matches) {
          for (const [ik, iv] of Object.entries(valObj)) {
            if (params.args.where[ik] === undefined) {
              params.args.where[ik] = iv;
            }
          }
          delete params.args.where[key];
        }
      }
    }

    params.action = original === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
    return next(params);
  }

  // ۵. سایر actions (create/update/delete) → دست نخورده
  return next(params);
};
