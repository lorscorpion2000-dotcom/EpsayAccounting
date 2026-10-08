import { Injectable, Logger } from '@nestjs/common';
import { AccountDetailType, AccountNature, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface EnsureDetailAccountInput {
  detailType: AccountDetailType;
  entityId: string;
  entityName: string;
  parentAccountCode?: string;
  codePadding?: number;
}

/**
 * نگاشت نوع موجودیت → کد حساب معین والد پیش‌فرض
 * وقتی یک مشتری/تأمین‌کننده/پرسنل/تنخواه جدید ثبت می‌شود،
 * یک حساب تفصیلی زیر این معین به‌طور خودکار ساخته می‌شود.
 */
const DEFAULT_PARENT_BY_TYPE: Partial<Record<AccountDetailType, string>> = {
  CUSTOMER: '1.1.2',      // حساب‌های دریافتنی
  SUPPLIER: '2.1.1',      // حساب‌های پرداختنی
  CONTRACTOR: '2.1.5',    // پیمانکاران و تأمین‌کنندگان
  EMPLOYEE: '2.1.2',      // بدهی پرسنلی
  PETTY_CASH: '1.1.5',    // تنخواه گردان ها
  // PROJECT → در فاز ۲ به عنوان CostCenter پیاده می‌شود
  // BANK/CASH_REGISTER → در فاز ۲ با مدل Bank
};

@Injectable()
export class DetailAccountsService {
  private readonly logger = new Logger(DetailAccountsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * یک حساب تفصیلی برای موجودیت مشخص می‌سازد (idempotent).
   * اگر قبلاً ساخته شده باشد، اسمش را در صورت تغییر آپدیت می‌کند.
   */
  async ensureDetailAccount(
    tx: Prisma.TransactionClient | PrismaService,
    input: EnsureDetailAccountInput,
  ) {
    const { detailType, entityId, entityName } = input;

    // ۱. بررسی وجود قبلی
    const existing = await tx.account.findFirst({
      where: { detailType, detailId: entityId } as any,
    });

    if (existing) {
      if (existing.name !== entityName) {
        await tx.account.update({
          where: { id: existing.id },
          data: { name: entityName },
        });
      }
      return existing;
    }

    // ۲. یافتن معین والد
    const parentCode = input.parentAccountCode ?? DEFAULT_PARENT_BY_TYPE[detailType];
    if (!parentCode) {
      this.logger.warn(`No default parent for detailType=${detailType}`);
      return null;
    }

    const parent = await tx.account.findFirst({ where: { code: parentCode } });
    if (!parent) {
      this.logger.warn(`Parent account "${parentCode}" not found for ${detailType}`);
      return null;
    }

    // ۳. تولید کد بعدی
    const siblings = await tx.account.findMany({
      where: { parentId: parent.id },
      select: { code: true },
    });

    const padding = input.codePadding ?? 2;
    let maxLast = 0;
    for (const s of siblings) {
      const parts = s.code.split('.');
      const last = parseInt(parts[parts.length - 1], 10) || 0;
      if (last > maxLast) maxLast = last;
    }
    const nextCode = `${parentCode}.${String(maxLast + 1).padStart(padding, '0')}`;

    // ۴. ساخت حساب تفصیلی
    const created = await tx.account.create({
      data: {
        code: nextCode,
        name: entityName,
        level: 'DETAIL' as any,
        nature: parent.nature,
        parentId: parent.id,
        isPostable: true,
        isActive: true,
        detailType: detailType as any,
        detailId: entityId,
      } as any,
    });

    this.logger.log(`✅ Created detail account ${nextCode} for ${detailType}:${entityId} (${entityName})`);

    // ۵. معین والد دیگر postable نیست (چون فرزند داره)
    if (parent.isPostable) {
      await tx.account.update({
        where: { id: parent.id },
        data: { isPostable: false },
      });
      this.logger.log(`   → Parent ${parentCode} marked as non-postable`);
    }

    return created;
  }

  /**
   * وقتی موجودیت حذف/غیرفعال می‌شود، حساب تفصیلی آن هم غیرفعال می‌شود.
   */
  async deactivateDetailAccount(
    tx: Prisma.TransactionClient | PrismaService,
    detailType: AccountDetailType,
    entityId: string,
  ) {
    const account = await tx.account.findFirst({
      where: { detailType, detailId: entityId } as any,
    });
    if (account) {
      await tx.account.update({
        where: { id: account.id },
        data: { isActive: false },
      });
      return true;
    }
    return false;
  }

  /**
   * سناریوی مهاجرت: برای همه موجودیت‌های موجود (مشتری، تأمین‌کننده، پرسنل)،
   * اگر حساب تفصیلی ندارند، ایجاد کن.
   */
  async backfillAllEntities() {
    const results = {
      customers: 0,
      suppliers: 0,
      contractors: 0,
      employees: 0,
      pettyCash: 0,
      skipped: 0,
    };

    // ─── مشتریان و تأمین‌کنندگان (Partner) ───
    const partners = await this.prisma.partner.findMany({
      where: { isActive: true },
    });

    const mapPartnerTypeToDetail: Partial<Record<string, AccountDetailType>> = {
      CLIENT: 'CUSTOMER' as any,
      SUPPLIER: 'SUPPLIER' as any,
      CONTRACTOR: 'CONTRACTOR' as any,
    };

    for (const p of partners) {
      const dt = mapPartnerTypeToDetail[p.type];
      if (!dt) { results.skipped++; continue; }

      const exists = await this.prisma.account.findFirst({
        where: { detailType: dt as any, detailId: p.id } as any,
      });
      if (exists) { results.skipped++; continue; }

      const created = await this.ensureDetailAccount(this.prisma, {
        detailType: dt as any,
        entityId: p.id,
        entityName: p.name,
      });
      if (!created) continue;

      if (dt === 'CUSTOMER') results.customers++;
      else if (dt === 'SUPPLIER') results.suppliers++;
      else if (dt === 'CONTRACTOR') results.contractors++;
    }

    // ─── پرسنل (Employee) ───
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true } as any,
    });

    for (const e of employees) {
      const exists = await this.prisma.account.findFirst({
        where: { detailType: 'EMPLOYEE' as any, detailId: e.id } as any,
      });
      if (exists) { results.skipped++; continue; }

      const created = await this.ensureDetailAccount(this.prisma, {
        detailType: 'EMPLOYEE' as any,
        entityId: e.id,
        entityName: e.fullName,
      });
      if (created) results.employees++;
    }

    // ─── تنخواه ───
    const pettyCashAccounts = await this.prisma.pettyCashAccount.findMany({
      where: { isActive: true } as any,
    });

    for (const pc of pettyCashAccounts) {
      const exists = await this.prisma.account.findFirst({
        where: { detailType: 'PETTY_CASH' as any, detailId: pc.id } as any,
      });
      if (exists) { results.skipped++; continue; }

      const created = await this.ensureDetailAccount(this.prisma, {
        detailType: 'PETTY_CASH' as any,
        entityId: pc.id,
        entityName: (pc as any).name || 'تنخواه',
      });
      if (created) results.pettyCash++;
    }

    return results;
  }
}