import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';

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
    } catch (e: any) {
      this.logger.error('Scan failed: ' + e.message);
    }
  }

  async scan() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let created = 0, skipped = 0;
    for (const rule of this.RULES) {
      try {
        const model = (this.prisma as any)[rule.entity.charAt(0).toLowerCase() + rule.entity.slice(1)];
        if (!model || typeof model.findMany !== 'function') { continue; }
        const where: any = {};
        where[rule.field] = { gte: now, lte: addDays(now, rule.daysAhead) };
        const items = await model.findMany({ where, select: { id: true, [rule.field]: true } });
        for (const item of items) {
          const dueDate: Date = item[rule.field];
          const daysLeft = daysBetween(dueDate, now);
          const severity = daysLeft <= 3 ? 'DANGER' : daysLeft <= 7 ? 'WARNING' : 'INFO';
          const msg = rule.label + ' تا ' + daysLeft + ' روز دیگر منقضی می‌شود';
          try {
            await this.prisma.notification.upsert({
              where: { type_entity_entityId: { type: rule.type, entity: rule.entity, entityId: item.id } },
              update: { dueDate, daysLeft, severity, message: msg },
              create: {
                type: rule.type, entity: rule.entity, entityId: item.id,
                title: rule.title, message: msg,
                link: rule.linkPrefix + '/' + item.id,
                dueDate, daysLeft, severity,
              },
            });
            created++;
          } catch (e: any) {
            this.logger.warn('upsert ' + rule.type + '/' + item.id + ': ' + e.message);
            skipped++;
          }
        }
      } catch (e: any) {
        this.logger.warn('rule ' + rule.type + ' failed: ' + e.message);
        skipped++;
      }
    }
    return { created, skipped, scannedAt: new Date().toISOString() };
  }

  async list(params: { unreadOnly?: boolean; limit?: number }) {
    const where: any = {};
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
