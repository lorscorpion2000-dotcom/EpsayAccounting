import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../modules/audit/audit.service';

interface AdminUser {
  id: string;
  username?: string;
  fullName?: string;
}

interface DeleteMeta {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * سرویس مشترک Soft Delete / Restore / Hard Delete
 * برای همه ماژول‌ها قابل استفاده است.
 *
 * نمونه:
 *   this.softDelete.adminDelete({
 *     model: 'project',
 *     id, user: req.user, reason: body.reason,
 *     meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
 *   })
 */
@Injectable()
export class SoftDeleteService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private getClient(model: string): any {
    const client = (this.prisma as any)[model];
    if (!client) {
      throw new NotFoundException('مدل ' + model + ' در Prisma یافت نشد');
    }
    return client;
  }

  private validateReason(reason?: string): string {
    const r = (reason || '').trim();
    if (r.length < 3) {
      throw new BadRequestException('دلیل باید حداقل ۳ کاراکتر باشد');
    }
    return r;
  }

  /**
   * حذف دائمی (hard delete) توسط مدیر — کاملاً از دیتابیس حذف می‌شود.
   * اگر رکورد در جای دیگری ارجاع داشته باشد، لیست وابستگی‌ها نمایش داده می‌شود.
   */
  async adminDelete(params: {
    model: string;
    id: string;
    user: AdminUser;
    reason: string;
    meta?: DeleteMeta;
  }) {
    const reason = this.validateReason(params.reason);
    const client = this.getClient(params.model);

    const existing = await client.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundException('رکورد یافت نشد');

    // تلاش برای حذف دائمی
    try {
      await client.delete({ where: { id: params.id } });
    } catch (e: any) {
      const code = e?.code;
      const msg = String(e?.message || '');

      if (code === 'P2003' || msg.includes('Foreign key constraint') || code === 'P2014') {
        const deps = await this.findDependencies(params.model, params.id);

        let list = '';
        if (deps.length > 0) {
          list = '\n\nوابستگی‌ها:\n' +
            deps.map(d => '• ' + d.label + ': ' + d.count + ' رکورد').join('\n');
        }

        throw new BadRequestException(
          'این رکورد به رکوردهای دیگر وابسته است و حذف دائمی ممکن نیست.' + list +
          '\n\nابتدا این وابستگی‌ها را حذف کنید یا از «آرشیو» استفاده کنید (قابل بازیابی).',
        );
      }
      throw e;
    }

    // لاگ
    try {
      await this.audit.log({
        userId: params.user.id,
        action: 'ADMIN_HARD_DELETE',
        entity: params.model,
        entityId: params.id,
        payload: { reason, username: params.user.username, fullName: params.user.fullName },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
      });
    } catch { /* silent */ }

    return { ok: true, id: params.id, hardDeleted: true, reason };
  }

  /**
   * پیدا کردن وابستگی‌های یک رکورد قبل از hard-delete.
   * از Prisma DMMF استفاده می‌کند تا برای همه مدل‌ها کار کند.
   */
  private async findDependencies(
    modelName: string,
    id: string,
  ): Promise<Array<{ model: string; label: string; count: number }>> {
    const prisma = this.prisma as any;
    const dmmf = Prisma.dmmf.datamodel;

    // پیدا کردن مدل در DMMF (case-insensitive)
    const targetModel = dmmf.models.find(
      (m) => m.name.toLowerCase() === modelName.toLowerCase(),
    );
    if (!targetModel) return [];

    const results: Array<{ model: string; label: string; count: number }> = [];
    const seen = new Set<string>();

    // پیدا کردن همه مدل‌هایی که یک relation به این مدل دارند
    for (const other of dmmf.models) {
      for (const field of other.fields) {
        if (field.kind !== 'object') continue;
        if (field.type !== targetModel.name) continue;
        if (!field.relationFromFields || field.relationFromFields.length === 0) continue;

        const where: any = {};
        for (const f of field.relationFromFields) where[f] = id;

        const clientName = other.name.charAt(0).toLowerCase() + other.name.slice(1);
        const client = prisma[clientName];
        if (!client || typeof client.count !== 'function') continue;

        const key = other.name;
        if (seen.has(key)) continue;
        seen.add(key);

        try {
          const count = await client.count({ __withDeleted: true, where });
          if (count > 0) {
            results.push({ model: other.name, label: this.modelLabel(other.name), count });
          }
        } catch { /* skip */ }
      }
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /** برچسب فارسی برای نام مدل Prisma */
  private modelLabel(name: string): string {
    const map: Record<string, string> = {
      PurchaseRequest: 'درخواست خرید',
      PurchaseRequestItem: 'ردیف درخواست خرید',
      PurchaseOrder: 'دستور خرید',
      PurchaseOrderItem: 'ردیف دستور خرید',
      PurchaseInvoice: 'فاکتور خرید',
      PurchaseInvoiceItem: 'ردیف فاکتور خرید',
      SupplierPayment: 'پرداخت تأمین‌کننده',
      GoodsReceipt: 'رسید انبار',
      GoodsReceiptItem: 'ردیف رسید انبار',
      GoodsIssue: 'حواله انبار',
      GoodsIssueItem: 'ردیف حواله انبار',
      Stock: 'موجودی انبار',
      StockMovement: 'گردش انبار',
      WarehouseTransfer: 'انتقال انبار',
      WarehouseTransferItem: 'ردیف انتقال',
      Expense: 'هزینه',
      ExpenseCategory: 'دسته هزینه',
      Cheque: 'چک',
      FixedAsset: 'دارایی ثابت',
      PettyCashAccount: 'حساب تنخواه',
      PettyCashRequest: 'درخواست شارژ تنخواه',
      PettyCashTransaction: 'تراکنش تنخواه',
      JournalEntry: 'سند حسابداری',
      JournalLine: 'خط سند',
      FiscalYear: 'سال مالی',
      Project: 'پروژه',
      WbsItem: 'فعالیت WBS',
      ProjectBudget: 'بودجه پروژه',
      Contract: 'قرارداد',
      LegalContract: 'قرارداد حقوقی',
      Partner: 'شخص / طرف حساب',
      User: 'کاربر',
      Role: 'نقش',
      UserRole: 'نقش کاربر',
      RolePermission: 'مجوز نقش',
      Account: 'حساب',
      AccountMapping: 'نگاشت حساب',
      Item: 'کالا',
      ItemCategory: 'دسته کالا',
      Unit: 'واحد',
      Warehouse: 'انبار',
      DailyReport: 'گزارش روزانه',
      DailyReportSection: 'بخش گزارش',
      DailyReportForwarding: 'ارسال گزارش',
      Equipment: 'ماشین‌آلات',
      EquipmentDailyLog: 'کارکرد ماشین',
      EquipmentMaintenance: 'تعمیر ماشین',
      EmployeeProfile: 'پرسنل',
      PayrollPeriod: 'دوره حقوق',
      PayrollRecord: 'فیش حقوقی',
      Attendance: 'حضور و غیاب',
      DailyWorkLog: 'کارکرد روزانه',
      LeaveRequest: 'مرخصی',
      AdvanceRequest: 'مساعده',
      SubcontractorStatement: 'صورت‌وضعیت پیمانکار',
      SubcontractorStatementItem: 'ردیف صورت‌وضعیت',
      WorkerStatement: 'صورت‌وضعیت پرسنل',
      WorkerStatementItem: 'ردیف صورت‌وضعیت',
      ClientStatement: 'صورت‌وضعیت کارفرما',
      ClientStatementItem: 'ردیف صورت‌وضعیت',
      SalesInvoice: 'فاکتور فروش',
      SalesInvoiceItem: 'ردیف فاکتور فروش',
      SalesReceipt: 'دریافت از مشتری',
      SalesContract: 'قرارداد فروش',
      SalesCustomer: 'مشتری',
      SalesUnit: 'واحد قابل فروش',
      OverheadAllocation: 'تخصیص سربار',
      OverheadAllocationItem: 'ردیف تخصیص',
      AdjustmentIndex: 'شاخص تعدیل',
      AdjustmentCalculation: 'محاسبه تعدیل',
      MaterialPriceDiff: 'مابه‌التفاوت مصالح',
      Permit: 'مجوز',
      Insurance: 'بیمه‌نامه',
      Guarantee: 'ضمانت‌نامه',
      TechnicalDocument: 'سند فنی',
      PhaseChecklist: 'چک‌لیست',
      PriceList: 'فهرست بها',
      PriceListItem: 'ردیف فهرست بها',

      CostCenter: 'مرکز هزینه',
      Attachment: 'پیوست',
    };
    return map[name] || name;
  }

  /** بازیابی رکورد حذف‌شده */
  async restore(params: { model: string; id: string; user: AdminUser; meta?: DeleteMeta }) {
    const client = this.getClient(params.model);

    const existing = await client.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundException('رکورد یافت نشد');
    if (!existing.deletedAt) {
      return { ok: true, id: params.id, alreadyActive: true };
    }

    // F24: partner restore fix — isActive را هم true کن
    const updateData: any = { deletedAt: null, deletedBy: null };
    if (params.model === 'partner') {
      updateData.isActive = true;
    }
    await client.update({
      where: { id: params.id },
      data: updateData,
    });

    try {
      await this.audit.log({
        userId: params.user.id,
        action: 'ADMIN_RESTORE',
        entity: params.model,
        entityId: params.id,
        payload: { username: params.user.username, fullName: params.user.fullName },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
      });
    } catch { /* silent */ }

    return { ok: true, id: params.id, restored: true };
  }

  /** لیست رکوردهای حذف‌شده */
  async listDeleted(params: { model: string; take?: number; skip?: number }) {
    const client = this.getClient(params.model);
    const take = Math.min(params.take ?? 100, 500);
    const skip = params.skip ?? 0;

    const [items, total] = await Promise.all([
      client.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        skip,
      }),
      client.count({ where: { deletedAt: { not: null } } }),
    ]);

    return { items, total, take, skip };
  }
}
