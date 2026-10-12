import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

const D = Prisma.Decimal;

@Injectable()
export class JournalsService {
  constructor(
    private prisma: PrismaService,
    private fiscalYears: FiscalYearsService,
  ) {}

  async findAll(query?: {
    fiscalYearId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = { deletedAt: null };
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

    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(200, Math.max(10, query?.pageSize ?? 50));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          fiscalYear: { select: { id: true, code: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { entryNumber: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
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
    if (!entry || entry.deletedAt) {
      throw new NotFoundException('Journal entry not found');
    }
    return entry;
  }

  private async ensureFiscalYearOpen(fiscalYearId: string, entryDate: Date) {
    // B2.3: delegated to centralized helper (unified PERIOD_LOCKED error)
    void fiscalYearId;
    return this.fiscalYears.assertPeriodOpen(entryDate);
  }

  private async validateAccounts(lines: any[]) {
    const ids = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, isPostable: true, isActive: true },
    });
    if (accounts.length !== ids.length) {
      throw new BadRequestException('One or more accounts were not found');
    }
    const bad = accounts.filter((a) => !a.isPostable || !a.isActive);
    if (bad.length) {
      throw new BadRequestException(
        `Accounts not postable/inactive: ${bad.map((a) => a.code).join(', ')}`,
      );
    }
  }

  private validateAndCompute(lines: any[]) {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Entry must have at least two lines');
    }

    let totalDebit = new D(0);
    let totalCredit = new D(0);
    let hasValue = false;

    for (const line of lines) {
      let d: Prisma.Decimal;
      let c: Prisma.Decimal;
      try {
        d = new D(line.debit ?? 0);
        c = new D(line.credit ?? 0);
      } catch {
        throw new BadRequestException('Invalid amount in journal line');
      }

      if (d.isNegative() || c.isNegative()) {
        throw new BadRequestException('Amounts cannot be negative');
      }
      if (!d.isZero() && !c.isZero()) {
        throw new BadRequestException(
          'A line cannot be both debit and credit',
        );
      }
      if (d.isZero() && c.isZero()) continue;

      hasValue = true;
      totalDebit = totalDebit.plus(d);
      totalCredit = totalCredit.plus(c);
    }

    if (!hasValue) {
      throw new BadRequestException('Entry must have at least one valued line');
    }
    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Entry is not balanced. Debit: ${totalDebit.toFixed(2)} | Credit: ${totalCredit.toFixed(2)}`,
      );
    }

    return { totalDebit, totalCredit };
  }

  private async allocateEntryNumber(
    tx: Prisma.TransactionClient,
    fiscalYearId: string,
  ) {
    const fy = await tx.fiscalYear.update({
      where: { id: fiscalYearId },
      data: { nextEntryNumber: { increment: 1 } },
      select: { code: true, nextEntryNumber: true },
    });
    const entryNumber = fy.nextEntryNumber - 1;
    const code = `JV-${fy.code}-${String(entryNumber).padStart(5, '0')}`;
    return { code, entryNumber };
  }

  async create(
    dto: CreateJournalDto,
    userId?: string,
    meta?: { sourceType?: string; sourceId?: string },
    tx?: Prisma.TransactionClient,
  ) {
    const { totalDebit, totalCredit } = this.validateAndCompute(dto.lines);
    await this.validateAccounts(dto.lines);

    const entryDate = new Date(dto.entryDate);
    await this.ensureFiscalYearOpen(dto.fiscalYearId, entryDate);

    const runInTx = async (tx: Prisma.TransactionClient) => {
        const { code, entryNumber } = await this.allocateEntryNumber(
          tx,
          dto.fiscalYearId,
        );

        return tx.journalEntry.create({
          data: {
            code,
            entryNumber,
            entryDate,
            fiscalYearId: dto.fiscalYearId,
            description: dto.description,
            reference: dto.reference,
            status: 'DRAFT',
            totalDebit,
            totalCredit,
            sourceType: meta?.sourceType ?? 'manual',
            sourceId: meta?.sourceId,
            createdById: userId || undefined,
            lines: {
              create: dto.lines
                .filter(
                  (l) =>
                    !new D(l.debit ?? 0).isZero() ||
                    !new D(l.credit ?? 0).isZero(),
                )
                .map((l, idx) => ({
                  accountId: l.accountId,
                  description: l.description,
                  debit: new D(l.debit ?? 0),
                  credit: new D(l.credit ?? 0),
                  projectId: l.projectId,
                  partnerId: l.partnerId,
                  sortOrder: l.sortOrder ?? idx,
                })),
            },
          },
          include: {
            lines: {
              include: { account: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
    };

    if (tx) return runInTx(tx);
    return this.prisma.$transaction(
      runInTx,
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(id: string, dto: UpdateJournalDto, _userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({ where: { id } });
      if (!entry || entry.deletedAt) {
        throw new NotFoundException('Journal entry not found');
      }
      if (entry.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT entries can be edited');
      }

      // B2.3: period lock
      await this.fiscalYears.assertPeriodOpen(entry.entryDate, tx);

      const data: any = {};
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.reference !== undefined) data.reference = dto.reference;

      if (dto.entryDate !== undefined) {
        const newDate = new Date(dto.entryDate);
        await this.ensureFiscalYearOpen(entry.fiscalYearId, newDate);
        data.entryDate = newDate;
      }

      if (dto.lines) {
        const { totalDebit, totalCredit } = this.validateAndCompute(dto.lines);
        await this.validateAccounts(dto.lines);
        data.totalDebit = totalDebit;
        data.totalCredit = totalCredit;

        await tx.journalLine.deleteMany({ where: { journalEntryId: id } });
        data.lines = {
          create: dto.lines
            .filter(
              (l) =>
                !new D(l.debit ?? 0).isZero() ||
                !new D(l.credit ?? 0).isZero(),
            )
            .map((l, idx) => ({
              accountId: l.accountId,
              description: l.description,
              debit: new D(l.debit ?? 0),
              credit: new D(l.credit ?? 0),
              projectId: l.projectId,
              partnerId: l.partnerId,
              sortOrder: l.sortOrder ?? idx,
            })),
        };
      }

      return tx.journalEntry.update({
        where: { id },
        data,
        include: {
          lines: {
            include: { account: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({ where: { id } });
      if (!entry || entry.deletedAt) {
        throw new NotFoundException('Journal entry not found');
      }
      if (entry.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT entries can be deleted');
      }

      // B2.3: period lock
      await this.fiscalYears.assertPeriodOpen(entry.entryDate, tx);
      await tx.journalEntry.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: userId },
      });
      return { success: true };
    });
  }

  async post(id: string, _userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!entry || entry.deletedAt) {
        throw new NotFoundException('Journal entry not found');
      }
      if (entry.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT entries can be posted');
      }
      await this.ensureFiscalYearOpen(entry.fiscalYearId, entry.entryDate);

      // Re-validate balance using Decimal
      const d = entry.lines.reduce(
        (s, l) => s.plus(l.debit),
        new D(0),
      );
      const c = entry.lines.reduce(
        (s, l) => s.plus(l.credit),
        new D(0),
      );
      if (!d.equals(c)) {
        throw new BadRequestException(
          'Entry is not balanced. Cannot post.',
        );
      }

      return tx.journalEntry.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    });
  }

  async reverse(
    id: string,
    reason: string,
    reversalDate: Date,
    userId: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException(
        'Reversal reason must be at least 5 characters',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const original = await tx.journalEntry.findUnique({
          where: { id },
          include: { lines: true, fiscalYear: true },
        });
        if (!original || original.deletedAt) {
          throw new NotFoundException('Journal entry not found');
        }
        if (original.status !== 'POSTED') {
          throw new BadRequestException('Only POSTED entries can be reversed');
        }

        await this.ensureFiscalYearOpen(
          original.fiscalYearId,
          reversalDate,
        );

        const { code, entryNumber } = await this.allocateEntryNumber(
          tx,
          original.fiscalYearId,
        );

        const reversal = await tx.journalEntry.create({
          data: {
            code,
            entryNumber,
            entryDate: reversalDate,
            fiscalYearId: original.fiscalYearId,
            description: `Reversal of ${original.code} - ${reason}`,
            reference: original.code,
            status: 'POSTED',
            postedAt: new Date(),
            sourceType: 'reversal',
            sourceId: original.id,
            createdById: userId || undefined,
            totalDebit: original.totalCredit,
            totalCredit: original.totalDebit,
            lines: {
              create: original.lines.map((l, idx) => ({
                accountId: l.accountId,
                description: `Reversal: ${l.description || ''}`,
                debit: l.credit,
                credit: l.debit,
                projectId: l.projectId,
                partnerId: l.partnerId,
                sortOrder: idx,
              })),
            },
          },
        });

        await tx.journalEntry.update({
          where: { id },
          data: {
            status: 'REVERSED',
            reversedAt: new Date(),
            reversalReason: reason,
            reversedById: userId,
          },
        });

        return reversal;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * حذف سند حسابداری با ثبت لاگ ویژه (فقط مدیر ارشد)
   * - حتی سند Posted قابل حذف است
   * - snapshot کامل در JournalDeletionLog ذخیره می‌شود
   * - soft delete در خود سند انجام می‌شود
   */
  async deleteWithLog(
    id: string,
    user: { id: string; username?: string; fullName?: string },
    reason: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    // 1) Load journal with lines
    const journal: any = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { account: true } } },
    });
    if (!journal) {
      throw new Error('سند یافت نشد');
    }

    // B2.3: period lock
    await this.fiscalYears.assertPeriodOpen(journal.entryDate);
    if ((journal as any).deletedAt) {
      throw new Error('این سند قبلاً حذف شده است');
    }

    // 2) Snapshot to JournalDeletionLog
    const snapshot = {
      journal: {
        id: journal.id,
        no: journal.no,
        date: journal.date,
        status: journal.status,
        description: journal.description,
        fiscalYearId: journal.fiscalYearId,
      },
      lines: (journal.lines || []).map((l: any) => ({
        accountId: l.accountId,
        accountCode: l.account?.code,
        accountName: l.account?.name,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description,
      })),
    };

    const totalDebit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
    const totalCredit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0);

    await this.prisma.journalDeletionLog.create({
      data: {
        journalId: journal.id,
        journalNo: journal.no,
        journalDate: journal.date,
        fiscalYearId: journal.fiscalYearId,
        status: journal.status,
        description: journal.description,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        linesSnapshot: snapshot.lines as any,
        journalSnapshot: snapshot.journal as any,
        reason: reason,
        deletedBy: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    // 3) Soft delete the journal
    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      } as any,
    });

    return {
      ok: true,
      journalId: journal.id,
      journalNo: journal.no,
      snapshotStored: true,
    };
  }

  async listDeletions(limit = 100) {
    return this.prisma.journalDeletionLog.findMany({
      orderBy: { deletedAt: 'desc' },
      take: Math.min(500, limit),
    });
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.journalEntry.findUnique({ where: { id } });
    if (!existing) throw new Error('سند یافت نشد');
    if (!existing.deletedAt) throw new Error('سند حذف نشده است');

    await this.prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: null } as any,
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  // ============================================================
  // Hard delete (admin only) — snapshot در JournalDeletionLog
  // ============================================================
  async hardDelete(
    id: string,
    user: { id: string; username?: string; fullName?: string },
    reason: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const journal: any = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { account: true } } },
    });
    if (!journal) throw new Error('سند یافت نشد');

    // B2.3: period lock
    await this.fiscalYears.assertPeriodOpen(journal.entryDate);

    const snapshot = {
      journal: {
        id: journal.id,
        code: journal.code,
        entryNumber: journal.entryNumber,
        entryDate: journal.entryDate,
        status: journal.status,
        description: journal.description,
        fiscalYearId: journal.fiscalYearId,
        totalDebit: Number(journal.totalDebit || 0),
        totalCredit: Number(journal.totalCredit || 0),
      },
      lines: (journal.lines || []).map((l: any) => ({
        accountId: l.accountId,
        accountCode: l.account?.code,
        accountName: l.account?.name,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description,
      })),
    };

    const totalDebit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
    const totalCredit = (journal.lines || []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.journalDeletionLog.create({
        data: {
          journalId: journal.id,
          journalNo: journal.code,
          journalDate: journal.entryDate,
          fiscalYearId: journal.fiscalYearId,
          status: journal.status,
          description: journal.description,
          totalDebit,
          totalCredit,
          linesSnapshot: snapshot.lines as any,
          journalSnapshot: snapshot.journal as any,
          reason: reason || 'حذف کامل توسط مدیر',
          deletedBy: user.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      await tx.journalLine.deleteMany({ where: { journalEntryId: id } });
      await tx.journalEntry.delete({ where: { id } });
    });

    return { ok: true, hardDeleted: true, journalId: journal.id, journalNo: journal.code };
  }
}
