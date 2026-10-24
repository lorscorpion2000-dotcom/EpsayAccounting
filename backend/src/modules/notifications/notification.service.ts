import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { startOfLocalDay } from '../../common/utils/date.util';

function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function daysBetween(a: Date, b: Date): number { return Math.ceil((a.getTime() - b.getTime()) / 86400000); }

interface ScanRule {
  type: string;
  entity: string;
  daysAhead: number;
  field: string;
  linkPrefix: string;
  title: string;
  label: string;
}

interface ScannableDelegate {
  findMany: (args: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  }) => Promise<Record<string, unknown>[]>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly RULES: ScanRule[] = [
    { type: 'CONTRACT_EXPIRING',  entity: 'Contract',         daysAhead: 30, field: 'endDate',    linkPrefix: '/contracts',           title: 'قرارداد در حال انقضا',    label: 'قرارداد' },
    { type: 'PERMIT_EXPIRING',    entity: 'Permit',           daysAhead: 30, field: 'expiryDate', linkPrefix: '/timeline/permits',    title: 'مجوز در حال انقضا',       label: 'مجوز' },
    { type: 'INSURANCE_EXPIRING', entity: 'Insurance',        daysAhead: 30, field: 'expiryDate', linkPrefix: '/timeline/insurances', title: 'بیمه‌نامه در حال انقضا', label: 'بیمه‌نامه' },
    { type: 'GUARANTEE_EXPIRING', entity: 'Guarantee',        daysAhead: 30, field: 'expiryDate', linkPrefix: '/timeline/guarantees', title: 'ضمانت‌نامه در حال انقضا', label: 'ضمانت‌نامه' },
    { type: 'FISCAL_YEAR_ENDING', entity: 'FiscalYear',       daysAhead: 30, field: 'endDate',    linkPrefix: '/settings/fiscal-years', title: 'سال مالی در حال پایان', label: 'سال مالی' },
    { type: 'INSTALLMENT_DUE',    entity: 'SalesInstallment', daysAhead: 7,  field: 'dueDate',    linkPrefix: '/sales/invoices',      title: 'قسط فروش سررسید نزدیک', label: 'قسط' },
    { type: 'PAYROLL_ENDING',     entity: 'PayrollPeriod',    daysAhead: 5,  field: 'endDate',    linkPrefix: '/payroll/periods',     title: 'دوره حقوق در حال پایان', label: 'دوره حقوق' },
    { type: 'RFQ_EXPIRING',       entity: 'RFQ',              daysAhead: 3,  field: 'validUntil', linkPrefix: '/procurement/rfqs',    title: 'استعلام در حال انقضا',   label: 'استعلام' },
  ];

  constructor(private prisma: PrismaService) {}

  @Cron('0 8 * * *', { name: 'notification-scan' })
  async dailyScan() {
    this.logger.log('Daily notification scan starting...');
    try {
      const r = await this.scan();
      this.logger.log('Scan done: ' + r.created + ' created, ' + r.skipped + ' skipped');
    } catch (e) {
      this.logger.error('Scan failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async scan() {
    const now = startOfLocalDay();
    let created = 0, skipped = 0;
    for (const rule of this.RULES) {
      try {
        const prismaRecord = this.prisma as unknown as Record<string, ScannableDelegate | undefined>;
        const model = prismaRecord[rule.entity.charAt(0).toLowerCase() + rule.entity.slice(1)];
        if (!model || typeof model.findMany !== 'function') { continue; }
        const where: Record<string, unknown> = {};
        where[rule.field] = { gte: now, lte: addDays(now, rule.daysAhead) };
        const items = await model.findMany({ where, select: { id: true, [rule.field]: true } });
        for (const item of items) {
          const dueDate = item[rule.field] as Date;
          const daysLeft = daysBetween(dueDate, now);
          const severity = daysLeft <= 3 ? 'DANGER' : daysLeft <= 7 ? 'WARNING' : 'INFO';
          const msg = rule.label + ' تا ' + daysLeft + ' روز دیگر منقضی می‌شود';
          try {
            await this.prisma.notification.upsert({
              where: { type_entity_entityId: { type: rule.type, entity: rule.entity, entityId: String(item.id) } },
              update: { dueDate, daysLeft, severity, message: msg },
              create: {
                type: rule.type, entity: rule.entity, entityId: String(item.id),
                title: rule.title, message: msg,
                link: rule.linkPrefix + '/' + String(item.id),
                dueDate, daysLeft, severity,
              },
            });
            created++;
          } catch (e) {
            this.logger.warn('upsert ' + rule.type + '/' + String(item.id) + ': ' + (e instanceof Error ? e.message : String(e)));
            skipped++;
          }
        }
      } catch (e) {
        this.logger.warn('rule ' + rule.type + ' failed: ' + (e instanceof Error ? e.message : String(e)));
        skipped++;
      }
    }
    return { created, skipped, scannedAt: new Date().toISOString() };
  }

  async list(params: { unreadOnly?: boolean; limit?: number }) {
    const where: Prisma.NotificationWhereInput = {};
    if (params.unreadOnly) where.isRead = false;
    return this.prisma.notification.findMany({
      where,
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(200, params.limit || 50),
    });
  }

  async unreadCount() {
    const count = await this.prisma.notification.count({ where: { isRead: false } });
    return { count };
  }

  async markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead() {
    const r = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: r.count };
  }

  async remove(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async clearRead() {
    const r = await this.prisma.notification.deleteMany({ where: { isRead: true } });
    return { deleted: r.count };
  }
}
