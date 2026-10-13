import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  AttendanceStatus2,
  DailyReportSectionType,
  EquipmentLogStatus,
  ForwardingTarget,
  PRPriority,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PurchaseRequestsService } from '../procurement/pr.service';

interface ForwardRow {
  rowNumber: number;
  wbsItemId?: string | null;
  kind?: string | null;
  employeeId?: string | null;
  equipmentId?: string | null;
  movementType?: string | null;
  itemId?: string | null;
  warehouseId?: string | null;
  requestType?: string | null;
  pettyCashAccountId?: string | null;
  eventType?: string | null;
  title?: string;
  description?: string | null;
  quantity?: unknown;
  unit?: string | null;
  priority?: string | null;
  status?: string | null;
  workHours?: unknown;
  overtime?: unknown;
  teamName?: string | null;
  hoursWorked?: unknown;
  fuelLiters?: unknown;
  stopReason?: string | null;
  amount?: unknown;
  progressPct?: unknown;
  location?: string | null;
  [k: string]: unknown;
}

interface ForwardTarget {
  type: ForwardingTarget;
  notify?: boolean;
  archived?: boolean;
}

interface ForwardDetail {
  row: number;
  target: ForwardingTarget;
  ok: boolean;
  id?: string | null;
  code?: string | null;
  model?: string | null;
  error?: string;
}

interface DailyReportShape {
  id: string;
  code: string;
  reportDate: Date;
  projectId: string;
  createdById: string | null;
  progresses?: ForwardRow[];
  workers?: ForwardRow[];
  equipments?: ForwardRow[];
  materials?: ForwardRow[];
  requests?: ForwardRow[];
  events?: ForwardRow[];
}

interface DailyReportSectionShape {
  id: string;
  sectionType: DailyReportSectionType;
  status: string;
}

@Injectable()
export class DailyReportForwarderService {
  private readonly logger = new Logger(DailyReportForwarderService.name);

  constructor(
    private prisma: PrismaService,
    private prService: PurchaseRequestsService,
  ) {}

  /**
   * فوروارد یک بخش تأییدشده به واحدهای مقصد
   */
  async forwardSection(reportId: string, sectionType: string) {
    const section = await this.prisma.dailyReportSection.findUnique({
      where: { reportId_sectionType: { reportId, sectionType: sectionType as DailyReportSectionType } },
    });
    if (!section) throw new NotFoundException('بخش یافت نشد');
    if (section.status !== 'APPROVED' && section.status !== 'FORWARDED' && section.status !== 'FAILED') {
      throw new BadRequestException('بخش باید ابتدا تأیید شود');
    }

    const report = await this.prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        progresses: { orderBy: { rowNumber: 'asc' } },
        workers: { orderBy: { rowNumber: 'asc' } },
        equipments: { orderBy: { rowNumber: 'asc' } },
        materials: { orderBy: { rowNumber: 'asc' } },
        requests: { orderBy: { rowNumber: 'asc' } },
        events: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('گزارش یافت نشد');

    const rows = this.rowsForSection(report, sectionType);
    let success = 0;
    let failed = 0;
    const details: ForwardDetail[] = [];

    for (const row of rows) {
      const targets = this.targetsFor(sectionType, row);
      for (const t of targets) {
        try {
          const r = await this.forwardRow(report, section, row, t);
          success++;
          details.push({
            row: row.rowNumber,
            target: t.type,
            ok: true,
            id: r?.targetId || null,
            code: r?.targetCode || null,
            model: r?.targetModel || null,
          });
        } catch (e: unknown) {
          failed++;
          details.push({ row: row.rowNumber, target: t.type, ok: false, error: (e instanceof Error ? e.message : String(e)) || 'error' });
        }
      }
    }

    await this.prisma.dailyReportSection.update({
      where: { id: section.id },
      data: {
        status: failed > 0 && success === 0 ? 'FAILED' : 'FORWARDED',
        forwardedAt: new Date(),
      },
    });

    return { success, failed, total: success + failed, details };
  }

  // ═══ rows ═══
  private rowsForSection(report: DailyReportShape, sectionType: string): ForwardRow[] {
    switch (sectionType) {
      case 'PROGRESS': return report.progresses || [];
      case 'WORKERS': return report.workers || [];
      case 'EQUIPMENTS': return report.equipments || [];
      case 'MATERIALS': return report.materials || [];
      case 'REQUESTS': return report.requests || [];
      case 'EVENTS': return report.events || [];
      default: return [];
    }
  }

  // ═══ targets ═══
  private targetsFor(sectionType: string, row: ForwardRow): ForwardTarget[] {
    switch (sectionType) {
      case 'PROGRESS':
        if (!row.wbsItemId) return [{ type: 'OTHER' }];
        return [{ type: 'PROGRESS_RECORD' }];
      case 'WORKERS': {
        const kind = String(row.kind || 'OWN').toUpperCase();
        if (kind === 'CONTRACTOR') {
          // پرسنل پیمانکار: فقط در گزارش ذخیره می‌شود — سندی ساخته نمی‌شود (تنها در چاپ دیده می‌شود)
          return [{ type: 'OTHER', archived: true }];
        }
        if (!row.employeeId) return [{ type: 'OTHER' }];
        return [{ type: 'PAYROLL_ATTENDANCE' }];
      }
      case 'EQUIPMENTS':
        if (!row.equipmentId) return [{ type: 'OTHER' }];
        return [{ type: 'EQUIPMENT_LOG' }];
      case 'MATERIALS': {
        const mt = String(row.movementType || 'IN').toUpperCase();
        if ((mt === 'IN') && row.itemId && row.warehouseId) return [{ type: 'WAREHOUSE_RECEIPT' }];
        if ((mt === 'CONSUMPTION' || mt === 'OUT') && row.itemId && row.warehouseId) return [{ type: 'WAREHOUSE_ISSUE' }];
        return [{ type: 'OTHER' }];
      }
      case 'REQUESTS': {
        const rt = String(row.requestType || '').toUpperCase();
        if (rt === 'PURCHASE') return [{ type: 'PROCUREMENT_PR' }];
        if (rt === 'PETTY_CASH' && row.pettyCashAccountId) return [{ type: 'PETTY_CASH' }];
        return [{ type: 'OTHER' }];
      }
      case 'EVENTS': {
        const et = String(row.eventType || '').toUpperCase();
        if (et === 'INCIDENT' || et === 'STOP') return [{ type: 'OTHER', notify: true }];
        return [{ type: 'OTHER' }];
      }
      default:
        return [{ type: 'OTHER' }];
    }
  }

  // ═══ forward a single row to a target ═══
  private async forwardRow(report: DailyReportShape, section: DailyReportSectionShape, row: ForwardRow, target: ForwardTarget) {
    // Idempotency: چک قبلی
    const existing = await this.prisma.dailyReportForwarding.findFirst({
      where: {
        reportId: report.id,
        sectionType: section.sectionType,
        rowNumber: row.rowNumber,
        targetType: target.type as ForwardingTarget,
      },
    });
    if (existing && existing.status === 'SUCCESS') {
      return existing;
    }

    let targetId: string | null = null;
    let targetCode: string | null = null;
    let targetModel: string | null = null;

    try {
      switch (target.type) {
        // ═══ خرید ═══
        case 'PROCUREMENT_PR': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          const pr = await this.prService.create({
            projectId: report.projectId,
            requestDate: report.reportDate.toISOString().slice(0, 10),
            wbsItemId: row.wbsItemId || undefined,
            department: 'کارگاه',
            reason: 'از گزارش روزانه ' + report.code + ' — ' + row.title,
            items: [
              {
                description: row.title + (row.description ? ' | ' + row.description : ''),
                quantity: Number(row.quantity) || 1,
                unit: this.mapUnit(row.unit),
                priority: this.mapPriority(row.priority),
                notes: 'ردیف ' + row.rowNumber + ' گزارش ' + report.code,
              },
            ],
          } as unknown as Parameters<typeof this.prService.create>[0], report.createdById);
          // ارسال به کارتابل خرید برای تایید
          await this.prisma.purchaseRequest.update({
            where: { id: pr.id },
            data: { status: 'SUBMITTED' },
          });
          targetId = pr.id;
          targetCode = pr.code;
          targetModel = 'PurchaseRequest';
          break;
        }

        // ═══ تنخواه ═══
        case 'PETTY_CASH': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          const code = await this.genCode('pettyCashRequest', 'PCR', 'code');
          const account = await this.prisma.pettyCashAccount.findUnique({
            where: { id: row.pettyCashAccountId! },
          });
          if (!account) throw new Error('حساب تنخواه یافت نشد');
          const pcr = await this.prisma.pettyCashRequest.create({
            data: {
              code,
              accountId: row.pettyCashAccountId!,
              requestDate: report.reportDate,
              amount: Number(row.amount) || 0,
              currentBalance: Number(account.balance) || 0,
              reason: 'از گزارش روزانه ' + report.code + ': ' + row.title,
              status: 'PENDING',
              createdById: report.createdById,
            },
          });
          targetId = pcr.id;
          targetCode = pcr.code;
          targetModel = 'PettyCashRequest';
          break;
        }

        // ═══ پیشرفت WBS ═══
        case 'PROGRESS_RECORD': {
          const snap = await this.prisma.wbsProgressSnapshot.upsert({
            where: {
              reportId_wbsItemId: { reportId: report.id, wbsItemId: row.wbsItemId! },
            },
            update: {
              quantity: Number(row.quantity) || 0,
              unit: row.unit || null,
              progressPct: row.progressPct ? Number(row.progressPct) : null,
              description: row.description,
              location: row.location,
            },
            create: {
              projectId: report.projectId,
              wbsItemId: row.wbsItemId!,
              reportId: report.id,
              snapshotDate: report.reportDate,
              quantity: Number(row.quantity) || 0,
              unit: row.unit || null,
              progressPct: row.progressPct ? Number(row.progressPct) : null,
              description: row.description,
              location: row.location,
              createdById: report.createdById,
            },
          });
          targetId = snap.id;
          targetModel = 'WbsProgressSnapshot';
          break;
        }

        // ═══ حضور و کارکرد ═══
        case 'PAYROLL_ATTENDANCE': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          // upsert بر اساس (employeeId, workDate)
          // در DailyWorkLog کلید یکتا نداریم، پس findFirst می‌کنیم
          const existingLog = await this.prisma.dailyWorkLog.findFirst({
            where: {
              employeeId: row.employeeId!,
              workDate: report.reportDate,
            },
          });
          const data = {
            employeeId: row.employeeId!,
            workDate: report.reportDate,
            projectId: report.projectId,
            wbsItemId: row.wbsItemId || null,
            regularHours: Number(row.workHours) || 0,
            overtimeHours: Number(row.overtime) || 0,
            holidayHours: 0,
            description: (row.teamName ? row.teamName + ' — ' : '') + 'از گزارش ' + report.code,
            status: this.mapAttendanceStatus(row.status),
          };
          let log;
          if (existingLog) {
            log = await this.prisma.dailyWorkLog.update({
              where: { id: existingLog.id },
              data,
            });
          } else {
            log = await this.prisma.dailyWorkLog.create({
              data: { ...data, createdById: report.createdById },
            });
          }
          targetId = log.id;
          targetModel = 'DailyWorkLog';

          // همچنین ثبت در Attendance برای نمایش در گرید ماهانه و محاسبه حقوق
          try {
            const attStatus = this.mapAttendanceStatus(row.status);
            const existingAtt = await this.prisma.attendance.findFirst({
              where: {
                employeeId: row.employeeId!,
                attendanceDate: report.reportDate,
              },
            });

            const attData: Record<string, unknown> = {
              checkIn: null,
              checkOut: null,
              workHours: Number(row.workHours) || 0,
              overtimeHours: Number(row.overtime) || 0,
              status: attStatus,
              notes: 'از گزارش روزانه ' + report.code + ' (ردیف ' + row.rowNumber + ')',
            };

            if (existingAtt) {
              await this.prisma.attendance.update({
                where: { id: existingAtt.id },
                data: attData,
              });
            } else {
              await this.prisma.attendance.create({
                data: {
                  ...attData,
                  employeeId: row.employeeId!,
                  attendanceDate: report.reportDate,
                  createdById: report.createdById || null,
                },
              });
            }
          } catch (e: unknown) {
            // اگه attendance ثبت نشد، حداقل DailyWorkLog ثبت شده
            this.logger?.warn?.('[forwarder] attendance sync failed: ' + (e instanceof Error ? e.message : String(e)));
          }

          break;
        }

        // ═══ ماشین‌آلات ═══
        case 'EQUIPMENT_LOG': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          const code = await this.genCode('equipmentDailyLog', 'EDL', 'code');
          const existingLog = await this.prisma.equipmentDailyLog.findFirst({
            where: {
              equipmentId: row.equipmentId!,
              logDate: report.reportDate,
            },
          });
          const data = {
            equipmentId: row.equipmentId!,
            projectId: report.projectId,
            wbsItemId: row.wbsItemId || null,
            logDate: report.reportDate,
            workHours: Number(row.hoursWorked) || 0,
            fuelLiters: Number(row.fuelLiters) || 0,
            stopHours: row.status === 'IDLE' ? (Number(row.hoursWorked) || 0) : 0,
            breakdownHours: row.status === 'BROKEN' ? (Number(row.hoursWorked) || 0) : 0,
            stopReason: row.stopReason || null,
            notes: 'از گزارش ' + report.code,
            status: EquipmentLogStatus.DRAFT,
          };
          let log;
          if (existingLog) {
            log = await this.prisma.equipmentDailyLog.update({
              where: { id: existingLog.id },
              data,
            });
          } else {
            log = await this.prisma.equipmentDailyLog.create({
              data: { ...data, code, createdById: report.createdById },
            });
          }
          targetId = log.id;
          targetCode = log.code;
          targetModel = 'EquipmentDailyLog';
          break;
        }

        // ═══ رسید انبار (پیش‌نویس) ═══
        case 'WAREHOUSE_RECEIPT': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          const code = await this.genCode('goodsReceipt', 'GRN', 'code');
          const receipt = await this.prisma.goodsReceipt.create({
            data: {
              code,
              warehouseId: row.warehouseId!,
              projectId: report.projectId,
              receiptDate: report.reportDate,
              notes: 'از گزارش روزانه ' + report.code + ' (ردیف ' + row.rowNumber + ')',
              status: 'SUBMITTED',
              createdById: report.createdById,
              items: {
                create: [{
                  itemId: row.itemId!,
                  rowNumber: 1,
                  quantity: Number(row.quantity) || 0,
                  unitCost: 0,
                  totalCost: 0,
                  notes: row.description || null,
                }],
              },
            },
          });
          targetId = receipt.id;
          targetCode = receipt.code;
          targetModel = 'GoodsReceipt';
          break;
        }

        // ═══ حواله مصرف (پیش‌نویس) ═══
        case 'WAREHOUSE_ISSUE': {
          if (!report.createdById) throw new Error('گزارش سازنده ندارد');
          const code = await this.genCode('goodsIssue', 'GIN', 'code');
          const issue = await this.prisma.goodsIssue.create({
            data: {
              code,
              warehouseId: row.warehouseId!,
              projectId: report.projectId,
              wbsItemId: row.wbsItemId || null,
              issueDate: report.reportDate,
              notes: 'از گزارش روزانه ' + report.code + ' (ردیف ' + row.rowNumber + ')',
              status: 'SUBMITTED',
              createdById: report.createdById,
              items: {
                create: [{
                  itemId: row.itemId!,
                  rowNumber: 1,
                  quantity: Number(row.quantity) || 0,
                  unitCost: 0,
                  totalCost: 0,
                  notes: row.description || null,
                }],
              },
            },
          });
          targetId = issue.id;
          targetCode = issue.code;
          targetModel = 'GoodsIssue';
          break;
        }

        // ═══ سایر ═══
        case 'OTHER': {
          if (target.notify) {
            await this.createNotification(report, section, row);
            targetModel = 'Notification';
          } else if (target.archived) {
            // B11: archive — no document, just mark forwarded
            targetModel = 'Archived';
          } else {
            targetModel = 'PENDING_IMPLEMENTATION';
          }
          break;
        }

        default:
          targetModel = 'PENDING_IMPLEMENTATION';
      }

      // ثبت موفقیت
      if (existing) {
        return await this.prisma.dailyReportForwarding.update({
          where: { id: existing.id },
          data: { status: 'SUCCESS', targetId, targetCode, targetModel },
        });
      }
      return await this.prisma.dailyReportForwarding.create({
        data: {
          sectionId: section.id,
          reportId: report.id,
          sectionType: section.sectionType,
          rowNumber: row.rowNumber,
          targetType: target.type as ForwardingTarget,
          status: 'SUCCESS',
          targetId, targetCode, targetModel,
        },
      });
    } catch (e: unknown) {
      const errorMessage = String(e instanceof Error ? e.message : String(e)).slice(0, 900);
      if (existing) {
        await this.prisma.dailyReportForwarding.update({
          where: { id: existing.id },
          data: { status: 'FAILED', errorMessage },
        });
      } else {
        await this.prisma.dailyReportForwarding.create({
          data: {
            sectionId: section.id,
            reportId: report.id,
            sectionType: section.sectionType,
            rowNumber: row.rowNumber,
            targetType: target.type as ForwardingTarget,
            status: 'FAILED',
            errorMessage,
          },
        });
      }
      throw e;
    }
  }

  // ═══ Notification ═══
  private async createNotification(report: DailyReportShape, section: DailyReportSectionShape, row: ForwardRow) {
    const severity = row.eventType === 'INCIDENT' ? 'CRITICAL' : 'WARNING';
    const title = row.eventType === 'INCIDENT' ? 'حادثه‌ی ایمنی در کارگاه' : 'توقف کار';
    const message = row.title + (row.description ? ' — ' + row.description : '');
    const entityId = report.id + ':' + section.sectionType + ':' + row.rowNumber;

    const existing = await this.prisma.notification.findFirst({
      where: { type: 'SITE_INCIDENT', entity: 'DailyReport', entityId },
    });
    if (existing) return existing;

    return this.prisma.notification.create({
      data: {
        type: 'SITE_INCIDENT',
        severity,
        title,
        message: message.slice(0, 500),
        entity: 'DailyReport',
        entityId,
        link: '/site-ops/daily-reports/' + report.id,
      },
    });
  }

  // ═══ helpers ═══
  private async genCode(model: string, prefix: string, field: string): Promise<string> {
    const year = new Date().getFullYear();
    const fullPrefix = prefix + '-' + year + '-';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic model access
    const last = await (this.prisma as any)[model].findFirst({
      where: { [field]: { startsWith: fullPrefix } },
      orderBy: { [field]: 'desc' },
      select: { [field]: true },
    });
    let lastNum = 0;
    if (last && last[field]) {
      const m = String(last[field]).match(new RegExp('^' + fullPrefix + '(\\d+)$'));
      if (m) lastNum = parseInt(m[1], 10) || 0;
    }
    return fullPrefix + String(lastNum + 1).padStart(4, '0');
  }

  private mapUnit(u?: string | null): string {
    const s = String(u || '').toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      'عدد': 'NUMBER', 'NUMBER': 'NUMBER',
      'کیلوگرم': 'KILOGRAM', 'KILOGRAM': 'KILOGRAM', 'KG': 'KILOGRAM',
      'تن': 'TON', 'TON': 'TON',
      'متر': 'METER', 'METER': 'METER',
      'مترمربع': 'SQUARE_METER', 'SQUARE_METER': 'SQUARE_METER',
      'مترمکعب': 'CUBIC_METER', 'CUBIC_METER': 'CUBIC_METER',
      'لیتر': 'LITER', 'LITER': 'LITER',
      'بسته': 'PACKAGE', 'PACKAGE': 'PACKAGE',
      'سرویس': 'SERVICE', 'SERVICE': 'SERVICE',
    };
    return map[u || ''] || map[s] || 'LUMP_SUM';
  }

  private mapPriority(p?: string | null): PRPriority {
    const s = String(p || '').toUpperCase();
    if (['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(s)) return s as PRPriority;
    return PRPriority.NORMAL;
  }

  private mapAttendanceStatus(s?: string | null): AttendanceStatus2 {
    const v = String(s || 'PRESENT').toUpperCase();
    if (['PRESENT', 'ABSENT', 'LEAVE', 'SICK', 'MISSION', 'HOLIDAY'].includes(v)) return v as AttendanceStatus2;
    return AttendanceStatus2.PRESENT;
  }

  // ============================================================
  // B-3: Failed forwardings — list + retry
  // ============================================================
  async getFailedForwardings(limit = 100) {
    const rows = await this.prisma.dailyReportForwarding.findMany({
      where: { status: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    if (rows.length === 0) return [];

    // برای نمایش کد گزارش و عنوان بخش
    const reportIds = Array.from(new Set(rows.map((r) => r.reportId)));
    const reports = await this.prisma.dailyReport.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, code: true, reportDate: true, projectId: true },
    });
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    const sectionIds = Array.from(new Set(rows.map((r) => r.sectionId)));
    const sections = await this.prisma.dailyReportSection.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, sectionType: true, status: true },
    });
    const sectionMap = new Map(sections.map((s) => [s.id, s]));

    return rows.map((f) => ({
      id: f.id,
      reportId: f.reportId,
      reportCode: reportMap.get(f.reportId)?.code || null,
      reportDate: reportMap.get(f.reportId)?.reportDate || null,
      projectId: reportMap.get(f.reportId)?.projectId || null,
      sectionType: f.sectionType,
      sectionStatus: sectionMap.get(f.sectionId)?.status || null,
      rowNumber: f.rowNumber,
      targetType: f.targetType,
      status: f.status,
      errorMessage: f.errorMessage,
      updatedAt: f.updatedAt,
    }));
  }

  async retryForwarding(forwardingId: string) {
    const fwd = await this.prisma.dailyReportForwarding.findUnique({
      where: { id: forwardingId },
      include: { section: true },
    });
    if (!fwd) throw new NotFoundException('Forwarding یافت نشد');
    if (fwd.status !== 'FAILED') {
      throw new BadRequestException('فقط ردیف‌های FAILED قابل retry هستند');
    }

    const report = await this.prisma.dailyReport.findUnique({
      where: { id: fwd.reportId },
      include: {
        progresses: { orderBy: { rowNumber: 'asc' } },
        workers: { orderBy: { rowNumber: 'asc' } },
        equipments: { orderBy: { rowNumber: 'asc' } },
        materials: { orderBy: { rowNumber: 'asc' } },
        requests: { orderBy: { rowNumber: 'asc' } },
        events: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('گزارش یافت نشد');

    const rows = this.rowsForSection(report, fwd.sectionType);
    const row = rows.find((r: ForwardRow) => r.rowNumber === fwd.rowNumber);
    if (!row) throw new NotFoundException('ردیف مورد نظر در گزارش پیدا نشد');

    const targets = this.targetsFor(fwd.sectionType, row);
    const target = targets.find((t: ForwardTarget) => t.type === (fwd.targetType as ForwardingTarget));
    if (!target) throw new NotFoundException('مقصد forwarding پیدا نشد');

    try {
      const r = await this.forwardRow(report, fwd.section, row, target);
      return {
        ok: true,
        targetId: r?.targetId || null,
        targetCode: r?.targetCode || null,
        targetModel: r?.targetModel || null,
      };
    } catch (e: unknown) {
      throw new BadRequestException(String(e instanceof Error ? e.message : String(e)).slice(0, 500));
    }
  }
}
