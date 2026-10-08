import { Prisma } from '@prisma/client';

/**
 * List of Prisma models that support soft delete (have deletedAt field).
 * These models will be auto-filtered so soft-deleted rows do not appear
 * in any query result.
 */
const SOFT_DELETE_MODELS = new Set<string>([
  'AdjustmentCalculation',
  'Attachment',
  'Attendance',
  'JournalDeletionLog',
  'JournalEntry',
  'MaterialPriceDiff',
  'PartnerCapitalAccount',
  'PettyCashRequest',
  'PurchaseInvoice',
  'PurchaseOrder',
  'PurchaseRequest',
  'RFQ',
  'SalesReceipt',
  'SupplierPayment',
]);

/**
 * Actions that should auto-filter soft-deleted records.
 */
const FILTER_ACTIONS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  // Always ensure args exists
  params.args = params.args || {};

  // ALWAYS strip __withDeleted — it's a custom flag Prisma doesn't know about
  const withDeleted = params.args.__withDeleted === true;
  if ('__withDeleted' in params.args) {
    delete params.args.__withDeleted;
  }

  if (!SOFT_DELETE_MODELS.has(params.model || '')) return next(params);
  if (!FILTER_ACTIONS.has(params.action)) return next(params);
  if (withDeleted) return next(params);

  // If caller already provides an explicit deletedAt filter → respect it
  const where = params.args.where || {};
  if (Object.prototype.hasOwnProperty.call(where, 'deletedAt')) {
    return next(params);
  }

  // Add filter
  params.args.where = { ...where, deletedAt: null };

  return next(params);
};
