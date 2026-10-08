import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DailyReportForwarderService } from './daily-report-forwarder.service';

/**
 * انواع بخش‌های گزارش روزانه (طبق سند بخش ۱۵-۳)
 */
export const SECTION_TYPES = [
  'HEADER',
  'PROGRESS',
  'WORKERS',
  'EQUIPMENTS',
  'MATERIALS',
  'ENTRY_EXIT',
  'REQUESTS',
  'EVENTS',
  'ATTACHMENTS',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

@Injectable()
export class DailyReportSectionsService {
  constructor(
    private prisma: PrismaService,
    private forwarder: DailyReportForwarderService,
  ) {}

  /** ساخت ۹ ردیف بخش برای یک گزارش جدید (idempotent) */
  async initSections(reportId: string) {
    const existing = await this.prisma.dailyReportSection.findMany({
      where: { reportId },
      select: { sectionType: true },
    });
    const have = new Set(existing.map((s) => s.sectionType));
    const missing = SECTION_TYPES.filter((t) => !have.has(t as any));

    if (missing.length === 0) return existing;

    await this.prisma.dailyReportSection.createMany({
      data: missing.map((t) => ({
        reportId,
        sectionType: t as any,
        status: 'PENDING' as any,
      })),
      skipDuplicates: true,
    });

    return this.prisma.dailyReportSection.findMany({
      where: { reportId },
      orderBy: { sectionType: 'asc' },
    });
  }

  /** لیست بخش‌های یک گزارش */
  async list(reportId: string) {
    await this.ensureReport(reportId);
    await this.initSections(reportId);

    return this.prisma.dailyReportSection.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
      include: {
        forwardings: true,
      },
    });
  }

  /** تأیید یک بخش */
  async approve(reportId: string, sectionType: string, userId: string) {
    await this.ensureReport(reportId);
    const type = this.normalizeType(sectionType);

    const section = await this.prisma.dailyReportSection.findUnique({
      where: { reportId_sectionType: { reportId, sectionType: type as any } },
    });
    if (!section) {
      // بساز اگر نیست
      await this.initSections(reportId);
    }

    const s = await this.prisma.dailyReportSection.findUnique({
      where: { reportId_sectionType: { reportId, sectionType: type as any } },
    });
    if (!s) throw new NotFoundException('بخش یافت نشد');

    if (s.status === 'APPROVED' || s.status === 'FORWARDED') {
      throw new BadRequestException('این بخش قبلاً تأیید شده است');
    }

    const updated = await this.prisma.dailyReportSection.update({
      where: { id: s.id },
      data: {
        status: 'APPROVED' as any,
        approvedById: userId,
        approvedAt: new Date(),
        rejectedReason: null,
      },
    });

    // فوروارد خودکار به مقصدها
    let forward: any = null;
    try {
      forward = await this.forwarder.forwardSection(reportId, type);
    } catch (e: any) {
      forward = { success: 0, failed: 0, error: e?.message || 'forward failed' };
    }

    return { ...updated, forward };
  }

  /** رد یک بخش با دلیل */
  async reject(reportId: string, sectionType: string, reason: string) {
    if (!reason || !reason.trim()) throw new BadRequestException('دلیل رد الزامی است');
    await this.ensureReport(reportId);
    const type = this.normalizeType(sectionType);

    const s = await this.prisma.dailyReportSection.findUnique({
      where: { reportId_sectionType: { reportId, sectionType: type as any } },
    });
    if (!s) throw new NotFoundException('بخش یافت نشد');

    if (s.status === 'FORWARDED') {
      throw new BadRequestException('بخش فوروارد شده قابل رد نیست — گزارش اصلاحی بسازید');
    }

    return this.prisma.dailyReportSection.update({
      where: { id: s.id },
      data: {
        status: 'REJECTED' as any,
        rejectedReason: reason,
        approvedById: null,
        approvedAt: null,
      },
    });
  }

  /** خلاصه وضعیت بخش‌ها (برای UI) */
  async summary(reportId: string) {
    await this.initSections(reportId);
    const sections = await this.prisma.dailyReportSection.findMany({
      where: { reportId },
    });
    const counts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      FORWARDED: 0,
      FAILED: 0,
    };
    for (const s of sections) {
      counts[s.status as keyof typeof counts]++;
    }
    return {
      total: sections.length,
      counts,
      allApproved: sections.every((s) => s.status === 'APPROVED' || s.status === 'FORWARDED'),
      anyRejected: sections.some((s) => s.status === 'REJECTED'),
    };
  }

  // ═══ helpers ═══
  private async ensureReport(reportId: string) {
    const r = await this.prisma.dailyReport.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException('گزارش روزانه یافت نشد');
    return r;
  }

  private normalizeType(t: string): SectionType {
    const up = String(t).toUpperCase().replace(/[^A-Z_]/g, '_');
    if (!SECTION_TYPES.includes(up as SectionType)) {
      throw new BadRequestException('نوع بخش نامعتبر: ' + t);
    }
    return up as SectionType;
  }
}
