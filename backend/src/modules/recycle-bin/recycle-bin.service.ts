export type RecycleEntity = string;

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

interface EntityDef {
  key: string;
  model: string;
  label: string;
  codeField?: string;
  titleField?: string;
  amountField?: string;
  linkFn?: (r: any) => string;
}

const ENTITIES: EntityDef[] = [
  { key: 'purchase-invoice', model: 'purchaseInvoice', label: 'فاکتور خرید', codeField: 'code', titleField: 'invoiceNumber', amountField: 'totalAmount', linkFn: (r) => '/procurement/invoices/' + r.id },
  { key: 'purchase-order',   model: 'purchaseOrder',   label: 'دستور خرید', codeField: 'code', titleField: 'code', amountField: 'totalAmount', linkFn: (r) => '/procurement/orders/' + r.id },
  { key: 'purchase-request', model: 'purchaseRequest', label: 'درخواست خرید', codeField: 'code', titleField: 'reason', linkFn: (r) => '/procurement/requests/' + r.id },
  { key: 'goods-receipt',    model: 'goodsReceipt',    label: 'رسید انبار', codeField: 'code', titleField: 'reference', amountField: 'totalValue', linkFn: (r) => '/warehouse/receipts/' + r.id },
  { key: 'goods-issue',      model: 'goodsIssue',      label: 'حواله انبار', codeField: 'code', titleField: 'usageLocation', amountField: 'totalValue', linkFn: () => '/warehouse/issues' },
  { key: 'journal-entry',      model: 'journalEntry',       label: 'سند حسابداری', codeField: 'code', titleField: 'description', amountField: 'totalDebit', linkFn: (r) => '/accounting/journals/' + r.id },
  { key: 'fiscal-year',        model: 'fiscalYear',         label: 'سال مالی', codeField: 'code', titleField: 'name', linkFn: () => '/settings/fiscal-years' },
  { key: 'cheque',             model: 'cheque',             label: 'چک', codeField: 'code', amountField: 'amount', linkFn: () => '/accounting/cheques' },
  { key: 'petty-cash-account', model: 'pettyCashAccount',   label: 'حساب تنخواه', codeField: 'code', titleField: 'name', amountField: 'balance', linkFn: () => '/petty-cash' },
  { key: 'petty-cash-request', model: 'pettyCashRequest',   label: 'درخواست شارژ تنخواه', codeField: 'code', titleField: 'reason', amountField: 'amount', linkFn: () => '/petty-cash' },
  { key: 'petty-cash-tx',      model: 'pettyCashTransaction', label: 'تراکنش تنخواه', codeField: 'code', titleField: 'description', amountField: 'amount', linkFn: () => '/petty-cash' },
  { key: 'fixed-asset',        model: 'fixedAsset',         label: 'دارایی ثابت', codeField: 'code', titleField: 'name', amountField: 'bookValue', linkFn: () => '/accounting/fixed-assets' },
  { key: 'expense',            model: 'expense',            label: 'هزینه', codeField: 'code', titleField: 'description', amountField: 'totalAmount', linkFn: () => '/expenses' },
  { key: 'expense-category',   model: 'expenseCategory',    label: 'دسته هزینه', codeField: 'code', titleField: 'name', linkFn: () => '/settings/expense-categories' },
  { key: 'overhead-allocation',model: 'overheadAllocation', label: 'تخصیص سربار', amountField: 'totalAmount', linkFn: () => '/overhead-allocations' },
  { key: 'adjustment-index',   model: 'adjustmentIndex',    label: 'شاخص تعدیل', linkFn: () => '/adjustment-indices' },
  { key: 'adjustment',         model: 'adjustmentCalculation', label: 'محاسبه تعدیل', linkFn: () => '/adjustments' },
  { key: 'material-price-diff',model: 'materialPriceDiff',  label: 'مابه‌التفاوت مصالح', amountField: 'diffAmount', linkFn: () => '/material-price-diffs' },
  { key: 'user',      model: 'user',      label: 'کاربر', codeField: 'username', titleField: 'fullName', linkFn: () => '/settings/users' },
  { key: 'role',      model: 'role',      label: 'نقش', codeField: 'code', titleField: 'name', linkFn: () => '/settings/roles' },
  { key: 'partner',   model: 'partner',   label: 'شخص / طرف حساب', codeField: 'code', titleField: 'name', linkFn: () => '/directory' },
  { key: 'project',   model: 'project',   label: 'پروژه', codeField: 'code', titleField: 'name', linkFn: () => '/projects' },
  { key: 'contract',  model: 'contract',  label: 'قرارداد', codeField: 'code', titleField: 'title', amountField: 'baseAmount', linkFn: () => '/contracts' },
  { key: 'unit',      model: 'unit',      label: 'واحد اندازه‌گیری', codeField: 'code', titleField: 'name', linkFn: () => '/settings/units' },
  { key: 'warehouse', model: 'warehouse', label: 'انبار', codeField: 'code', titleField: 'name', linkFn: () => '/warehouse/warehouses' },
  { key: 'item-category', model: 'itemCategory', label: 'دسته کالا', codeField: 'code', titleField: 'name', linkFn: () => '/warehouse/categories' },
  { key: 'item',      model: 'item',      label: 'کالا / مصالح', codeField: 'code', titleField: 'name', linkFn: () => '/warehouse/items' },
  { key: 'price-list',model: 'priceList', label: 'فهرست بها', codeField: 'code', titleField: 'title', linkFn: () => '/price-lists' },
  { key: 'daily-report',            model: 'dailyReport',           label: 'گزارش روزانه', codeField: 'code', titleField: 'operations', linkFn: (r) => '/site-ops/daily-reports/' + r.id },
  { key: 'subcontractor-statement', model: 'subcontractorStatement', label: 'صورت‌وضعیت پیمانکار', codeField: 'code', amountField: 'netPayable', linkFn: (r) => '/payroll/subcontractor-statements/' + r.id },
  { key: 'worker-statement',        model: 'workerStatement',        label: 'صورت‌وضعیت پرسنل', codeField: 'code', amountField: 'netPayable', linkFn: (r) => '/payroll/worker-statements/' + r.id },
  { key: 'client-statement',        model: 'clientStatement',        label: 'صورت‌وضعیت کارفرما', codeField: 'code', amountField: 'netPayable', linkFn: (r) => '/client-statements/' + r.id },
  { key: 'sales-invoice',   model: 'salesInvoice',   label: 'فاکتور فروش', codeField: 'code', titleField: 'invoiceNumber', amountField: 'totalAmount', linkFn: (r) => '/sales/invoices/' + r.id },
  { key: 'sales-receipt',   model: 'salesReceipt',   label: 'دریافت از مشتری', codeField: 'code', amountField: 'amount', linkFn: () => '/sales/receipts' },
  { key: 'sales-contract',  model: 'salesContract',  label: 'قرارداد فروش', codeField: 'code', titleField: 'title', linkFn: () => '/sales/contracts' },
  { key: 'sales-customer',  model: 'salesCustomer',  label: 'مشتری', titleField: 'fullName', linkFn: () => '/sales/customers' },
  { key: 'sales-unit',      model: 'salesUnit',      label: 'واحد قابل فروش', codeField: 'code', titleField: 'title', linkFn: () => '/sales/units' },
  { key: 'supplier-payment', model: 'supplierPayment', label: 'پرداخت تأمین‌کننده', codeField: 'code', amountField: 'amount', linkFn: () => '/procurement/supplier-payments' },
  { key: 'equipment',           model: 'equipment',              label: 'ماشین‌آلات', codeField: 'code', titleField: 'name', linkFn: () => '/equipment' },
  { key: 'equipment-daily-log', model: 'equipmentDailyLog',      label: 'کارکرد ماشین', codeField: 'code', linkFn: () => '/equipment/logs' },
  { key: 'equipment-maintenance', model: 'equipmentMaintenance', label: 'تعمیر ماشین', linkFn: () => '/equipment/maintenances' },
  { key: 'employee-profile', model: 'employeeProfile', label: 'پرسنل', linkFn: () => '/payroll/employees' },
  { key: 'payroll-period',   model: 'payrollPeriod',   label: 'دوره حقوق', linkFn: () => '/payroll/periods' },
  { key: 'payroll-record',   model: 'payrollRecord',   label: 'فیش حقوقی', amountField: 'netPay', linkFn: () => '/payroll/periods' },
  { key: 'attendance',       model: 'attendance',      label: 'حضور و غیاب', linkFn: () => '/payroll/attendance' },
  { key: 'daily-work-log',   model: 'dailyWorkLog',    label: 'کارکرد روزانه', linkFn: () => '/payroll/work-logs' },
  { key: 'leave-request',    model: 'leaveRequest',    label: 'مرخصی', codeField: 'code', linkFn: () => '/payroll/leave-requests' },
  { key: 'advance-request',  model: 'advanceRequest',  label: 'مساعده', codeField: 'code', amountField: 'amount', linkFn: () => '/payroll/advance-requests' },
  { key: 'partner-capital',  model: 'partnerCapitalAccount', label: 'حساب سرمایه شریک', linkFn: () => '/partner-capital/accounts' },
  { key: 'permit',      model: 'permit',      label: 'مجوز / پروانه', codeField: 'code', titleField: 'title', linkFn: () => '/timeline/permits' },
  { key: 'insurance',   model: 'insurance',   label: 'بیمه‌نامه', codeField: 'code', titleField: 'title', linkFn: () => '/timeline/insurances' },
  { key: 'guarantee',   model: 'guarantee',   label: 'ضمانت‌نامه', codeField: 'code', titleField: 'title', amountField: 'amount', linkFn: () => '/timeline/guarantees' },
  { key: 'document',    model: 'technicalDocument', label: 'سند فنی', linkFn: () => '/timeline/documents' },
  { key: 'checklist',   model: 'phaseChecklist', label: 'چک‌لیست', linkFn: () => '/timeline/checklists' },
];

const ENTITY_BY_KEY = new Map(ENTITIES.map(e => [e.key, e]));

export interface RecycleItem {
  id: string;
  entity: string;
  entityLabel: string;
  code: string | null;
  title: string | null;
  amount: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string | null;
  link: string;
}

@Injectable()
export class RecycleBinService {
  constructor(private prisma: PrismaService) {}

  async list(entity: string = 'all', limit = 200): Promise<RecycleItem[]> {
    const take = Math.min(500, limit);
    const out: RecycleItem[] = [];

    const targets = entity === 'all'
      ? ENTITIES
      : ENTITIES.filter(e => e.key === entity);

    for (const def of targets) {
      try {
        const client: any = (this.prisma as any)[def.model];
        if (!client || typeof client.findMany !== 'function') continue;

        const rows = await client.findMany({
          __withDeleted: true,
          where: { deletedAt: { not: null } },
          orderBy: { deletedAt: 'desc' },
          take,
        });

        for (const r of rows) {
          out.push({
            id: r.id,
            entity: def.key,
            entityLabel: def.label,
            code: def.codeField ? r[def.codeField] : null,
            title: def.titleField ? r[def.titleField] : null,
            amount: def.amountField ? Number(r[def.amountField] || 0) : null,
            deletedAt: r.deletedAt?.toISOString?.() || null,
            deletedBy: r.deletedBy || null,
            createdAt: r.createdAt?.toISOString?.() || null,
            link: def.linkFn ? def.linkFn(r) : '/',
          });
        }
      } catch (e) {
        continue;
      }
    }

    out.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
    return out.slice(0, take);
  }

  async counts() {
    const result: Record<string, number> = {};
    let total = 0;

    for (const def of ENTITIES) {
      try {
        const client: any = (this.prisma as any)[def.model];
        if (!client || typeof client.count !== 'function') { result[def.key] = 0; continue; }
        const c = await client.count({ __withDeleted: true, where: { deletedAt: { not: null } } });
        result[def.key] = c;
        total += c;
      } catch {
        result[def.key] = 0;
      }
    }

    return { ...result, total };
  }

  async restore(entity: string, id: string) {
    const def = ENTITY_BY_KEY.get(entity);
    if (!def) throw new NotFoundException('نوع موجودیت نامعتبر: ' + entity);

    const client: any = (this.prisma as any)[def.model];
    if (!client) throw new NotFoundException('مدل پیدا نشد: ' + def.model);

    const updateData: any = { deletedAt: null, deletedBy: null };
    const HAS_ISACTIVE = ['partner', 'user', 'role', 'unit', 'warehouse', 'itemCategory', 'item', 'project', 'contract', 'fiscalYear', 'equipment', 'permit', 'insurance', 'guarantee', 'technicalDocument', 'phaseChecklist'];
    if (HAS_ISACTIVE.includes(def.model)) {
      updateData.isActive = true;
    }

    await client.update({
      where: { id },
      data: updateData,
    });

    return { ok: true, entity, id, label: def.label };
  }

  entities() {
    return ENTITIES.map(e => ({ key: e.key, label: e.label }));
  }
}
