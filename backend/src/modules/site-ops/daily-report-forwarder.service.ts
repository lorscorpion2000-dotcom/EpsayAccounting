import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

@Injectable()
export class DailyReportsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(projectId: string): Promise<string> {
    const count = await this.prisma.dailyReport.count({ where: { projectId } });
    const prj = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { code: true },
    });
    const prefix = (prj?.code || 'PRJ') + '-DR-';
    return prefix + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; status?: string; fromDate?: string; toDate?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.reportDate = {};
      if (query.fromDate) where.reportDate.gte = new Date(query.fromDate);
      if (query.toDate) where.reportDate.lte = new Date(query.toDate);
    }

    return this.prisma.dailyReport.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        _count: {
          select: {
            attendances: true,
            equipments: true,
            materials: true,
            requests: true,
            events: true,
          },
        },
      },
      orderBy: { reportDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        attendances: true,
        equipments: true,
        materials: true,
        requests: true,
        events: true,
      },
    });
    if (!report) throw new NotFoundException('گزارش روزانه یافت نشد');
    return report;
  }

  async create(dto: CreateDailyReportDto, userId: string) {
    const code = await this.generateCode(dto.projectId);

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.create({
        data: {
          code,
          projectId: dto.projectId,
          reportDate: new Date(dto.reportDate),
          weather: dto.weather,
          temperatureMin: dto.temperatureMin,
          temperatureMax: dto.temperatureMax,
          shift: dto.shift || 'DAY',
          notes: dto.notes,
          status: 'DRAFT',
          createdById: userId,
          attendances: dto.attendances?.length
            ? { create: dto.attendances }
            : undefined,
          equipments: dto.equipments?.length
            ? { create: dto.equipments }
            : undefined,
          materials: dto.materials?.length
            ? { create: dto.materials }
            : undefined,
          requests: dto.requests?.length
            ? { create: dto.requests }
            : undefined,
          events: dto.events?.length
            ? { create: dto.events }
            : undefined,
        },
        include: {
          project: true,
          attendances: true,
          equipments: true,
          materials: true,
          requests: true,
          events: true,
        },
      });

      return report;
    });
  }

  /**
   * تأیید گزارش روزانه و صدور خودکار:
   * ۱. حواله انبار (GIN) برای مصالح مصرفی
   * ۲. درخواست خرید (PR) برای نیازهای اعلام شده
   */
  async approve(id: string, userId: string) {
    const report = await this.findOne(id);
    if (report.status !== 'SUBMITTED' && report.status !== 'DRAFT') {
      throw new BadRequestException('فقط گزارش‌های پیش‌نویس یا ارسال‌شده قابل تأیید هستند');
    }

    return this.prisma.$transaction(async (tx) => {
      // ۱. اگر درخواست خرید در گزارش ثبت شده بود، به PR تبدیل شود
      if (report.requests && report.requests.length > 0) {
        const prItems = report.requests.map((r, idx) => ({
          rowNumber: idx + 1,
          description: r.title + (r.description ? ` - ${r.description}` : ''),
          quantity: Number(r.quantity || 1),
          unit: 'NUMBER' as any,
          priority: 'NORMAL' as any,
        }));

        const prCode = 'PR-AUTO-' + String(Date.now()).slice(-6);
        await tx.purchaseRequest.create({
          data: {
            code: prCode,
            projectId: report.projectId,
            requestDate: new Date(),
            reason: `ایجاد خودکار از گزارش روزانه کارگاه کد ${report.code}`,
            status: 'PENDING_APPROVAL',
            createdById: userId,
            items: { create: prItems },
          },
        });
      }

      // ۲. بروزرسانی وضعیت گزارش روزانه به APPROVED
      const updated = await tx.dailyReport.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      return updated;
    });
  }

  async submit(id: string) {
    const report = await this.findOne(id);
    if (report.status !== 'DRAFT') {
      throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    }
    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async reject(id: string, reason?: string) {
    const report = await this.findOne(id);
    if (report.status !== 'SUBMITTED') {
      throw new BadRequestException('فقط گزارش‌های ارسال‌شده قابل رد هستند');
    }
    return this.prisma.dailyReport.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason ? `دلیل رد: ${reason}` : report.notes },
    });
  }

  async remove(id: string) {
    const report = await this.findOne(id);
    if (report.status === 'APPROVED') {
      throw new BadRequestException('گزارش تأییدشده قابل حذف نیست');
    }
    await this.prisma.dailyReport.delete({ where: { id } });
    return { success: true };
  }
}