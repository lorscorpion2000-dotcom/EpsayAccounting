import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

@Injectable()
export class JournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    fiscalYearId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }) {
    const where: any = {};
    if (query?.fiscalYearId) where.fiscalYearId = query.fiscalYearId;
    if (query?.status) where.status = query.status;
    if (query?.fromDate || query?.toDate) {
      where.entryDate = {};
      if (query.fromDate) where.entryDate.gte = new Date(query.fromDate);
      if (query.toDate) where.entryDate.lte = new Date(query.toDate);
    }
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.journalEntry.findMany({
      where,
      include: {
        fiscalYear: { select: { id: true, code: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { entryNumber: 'desc' }],
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        fiscalYear: true,
        lines: {
          include: { account: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!entry) throw new NotFoundException('سند یافت نشد');
    return entry;
  }

  /**
   * تولید کد و شماره سند
   */
  private async generateNumbers(fiscalYearId: string): Promise<{ code: string; entryNumber: number }> {
    const fy = await this.prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } });
    if (!fy) throw new NotFoundException('سال مالی یافت نشد');

    const last = await this.prisma.journalEntry.findFirst({
      where: { fiscalYearId },
      orderBy: { entryNumber: 'desc' },
    });
    const nextNumber = (last?.entryNumber || 0) + 1;
    const code = 'JV-' + fy.code + '-' + String(nextNumber).padStart(5, '0');
    return { code, entryNumber: nextNumber };
  }

  /**
   * اعتبارسنجی و محاسبه مجموع
   */
  private validateAndCompute(lines: any[]) {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('سند باید حداقل دو ردیف داشته باشد');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    let hasValue = false;

    for (const line of lines) {
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);
      if (d < 0 || c < 0) {
        throw new BadRequestException('مبالغ بدهکار و بستانکار نمی‌توانند منفی باشند');
      }
      if (d > 0 && c > 0) {
        throw new BadRequestException('یک ردیف نمی‌تواند هم بدهکار و هم بستانکار باشد');
      }
      if (d === 0 && c === 0) continue;
      hasValue = true;
      totalDebit += d;
      totalCredit += c;
    }

    if (!hasValue) {
      throw new BadRequestException('سند باید حداقل یک ردیف با مبلغ داشته باشد');
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `سند تراز نیست — بدهکار: ${totalDebit.toFixed(2)} | بستانکار: ${totalCredit.toFixed(2)}`,
      );
    }

    return { totalDebit, totalCredit };
  }

  async create(dto: CreateJournalDto) {
    const { totalDebit, totalCredit } = this.validateAndCompute(dto.lines);
    const { code, entryNumber } = await this.generateNumbers(dto.fiscalYearId);

    return this.prisma.journalEntry.create({
      data: {
        code,
        entryNumber,
        entryDate: new Date(dto.entryDate),
        fiscalYearId: dto.fiscalYearId,
        description: dto.description,
        reference: dto.reference,
        status: 'DRAFT',
        totalDebit,
        totalCredit,
        sourceType: 'manual',
        lines: {
          create: dto.lines
            .filter((l) => Number(l.debit || 0) !== 0 || Number(l.credit || 0) !== 0)
            .map((l, idx) => ({
              accountId: l.accountId,
              description: l.description,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              projectId: l.projectId,
              partnerId: l.partnerId,
              sortOrder: l.sortOrder ?? idx,
            })),
        },
      },
      include: {
        lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdateJournalDto) {
    const entry = await this.findOne(id);
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('فقط اسناد پیش‌نویس قابل ویرایش هستند');
    }

    const data: any = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.entryDate !== undefined) data.entryDate = new Date(dto.entryDate);

    if (dto.lines) {
      const { totalDebit, totalCredit } = this.validateAndCompute(dto.lines);
      data.totalDebit = totalDebit;
      data.totalCredit = totalCredit;

      // حذف خطوط قدیمی و ساخت جدیدها
      await this.prisma.journalLine.deleteMany({ where: { journalEntryId: id } });
      data.lines = {
        create: dto.lines
          .filter((l) => Number(l.debit || 0) !== 0 || Number(l.credit || 0) !== 0)
          .map((l, idx) => ({
            accountId: l.accountId,
            description: l.description,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            projectId: l.projectId,
            partnerId: l.partnerId,
            sortOrder: l.sortOrder ?? idx,
          })),
      };
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data,
      include: { lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async remove(id: string) {
    const entry = await this.findOne(id);
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('فقط اسناد پیش‌نویس قابل حذف هستند');
    }
    await this.prisma.journalEntry.delete({ where: { id } });
    return { success: true };
  }

  /**
   * ثبت سند (DRAFT → POSTED)
   */
  async post(id: string) {
    const entry = await this.findOne(id);
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('فقط اسناد پیش‌نویس قابل ثبت هستند');
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date() },
    });
  }

  /**
   * ابطال سند: یک سند معکوس ایجاد می‌کند و سند اصلی را REVERSED می‌کند
   */
  async reverse(id: string, reason: string, userId?: string) {
    const original = await this.findOne(id);
    if (original.status !== 'POSTED') {
      throw new BadRequestException('فقط اسناد ثبت‌شده قابل ابطال هستند');
    }

    const { code, entryNumber } = await this.generateNumbers(original.fiscalYearId);

    // ساخت سند معکوس
    const reversal = await this.prisma.journalEntry.create({
      data: {
        code,
        entryNumber,
        entryDate: new Date(),
        fiscalYearId: original.fiscalYearId,
        description: `ابطال سند ${original.code} - ${reason}`,
        reference: original.code,
        status: 'POSTED',
        postedAt: new Date(),
        sourceType: 'reversal',
        sourceId: original.id,
        createdById: userId,
        totalDebit: original.totalCredit,
        totalCredit: original.totalDebit,
        lines: {
          create: original.lines.map((l, idx) => ({
            accountId: l.accountId,
            description: `ابطال: ${l.description || ''}`,
            debit: l.credit,
            credit: l.debit,
            projectId: l.projectId,
            partnerId: l.partnerId,
            sortOrder: idx,
          })),
        },
      },
    });

    // به‌روزرسانی سند اصلی
    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversalReason: reason,
      },
    });

    return reversal;
  }
}
