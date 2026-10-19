import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { JournalsService } from '../accounting/journals.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class ChequesService {
  constructor(
    private prisma: PrismaService,
    private engine: AccountingEngineService,
  
    private journals: JournalsService,) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'cheque', 'code', 'CHQ-' + year + '-', { pad: 4 });
  }

  async findAll(query?: {
    direction?: string;
    status?: string;
    partnerId?: string;
    bankAccountId?: string;
    fromDueDate?: string;
    toDueDate?: string;
  }) {
    const where: any = {};
    if (query?.direction) where.direction = query.direction;
    if (query?.status) where.status = query.status;
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.bankAccountId) where.bankAccountId = query.bankAccountId;
    if (query?.fromDueDate || query?.toDueDate) {
      where.dueDate = {};
      if (query.fromDueDate) where.dueDate.gte = new Date(query.fromDueDate);
      if (query.toDueDate) where.dueDate.lte = new Date(query.toDueDate);
    }
    return this.prisma.cheque.findMany({
      where,
      include: {
        bankAccount: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.cheque.findUnique({
      where: { id },
      include: {
        bankAccount: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        issuedJournalEntry: { select: { id: true, code: true, status: true } },
        settledJournalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!c) throw new NotFoundException('چک یافت نشد');
    return c;
  }

  async create(dto: CreateChequeDto, userId?: string) {
    const code = await this.generateCode();

    if (!dto.partnerId) {
      throw new BadRequestException('طرف حساب الزامی است');
    }
    if (dto.direction === 'ISSUED' && !dto.bankAccountId) {
      throw new BadRequestException('حساب بانکی برای چک صادره الزامی است');
    }
    if (dto.amount <= 0) throw new BadRequestException('مبلغ باید مثبت باشد');

    const created = await this.prisma.cheque.create({
      data: {
        code,
        direction: dto.direction,
        serial: dto.serial,
        amount: dto.amount,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        description: dto.description,
        bankAccountId: dto.bankAccountId || null,
        partnerId: dto.partnerId,
        projectId: dto.projectId || null,
        createdById: userId || null,
        status: 'PENDING',
      },
    });

    // ─── JE تعهد اولیه ───
    const mappingCode =
      dto.direction === 'ISSUED' ? 'CHEQUE_ISSUED_PENDING' : 'CHEQUE_RECEIVED';

    try {
      const entry = await this.engine.postEvent(mappingCode, {
        amount: Number(created.amount),
        entryDate: created.issueDate,
        description: (dto.direction === 'ISSUED' ? 'ثبت چک صادره ' : 'ثبت چک دریافتی ') + created.code,
        partnerId: created.partnerId ?? undefined,
        bankAccountId: created.bankAccountId ?? undefined,
        projectId: created.projectId ?? undefined,
        sourceId: created.id,
        userId,
        autoPost: true,
        });
      return this.prisma.cheque.update({
        where: { id: created.id },
        data: { issuedJournalEntryId: entry.id },
        include: {
          bankAccount: { select: { id: true, code: true, name: true } },
          partner: { select: { id: true, code: true, name: true } },
        },
      });
    } catch (e) {
      // rollback
      await this.prisma.cheque.delete({ where: { id: created.id } });
      throw e;
    }
  }

  async update(id: string, dto: UpdateChequeDto) {
    const existing = await this.findOne(id);
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('فقط چک‌های در جریان قابل ویرایش هستند');
    }
    const data: any = {};
    if (dto.serial !== undefined) data.serial = dto.serial;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.issueDate !== undefined) data.issueDate = new Date(dto.issueDate);
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.bankAccountId !== undefined) data.bankAccountId = dto.bankAccountId;
    if (dto.partnerId !== undefined) data.partnerId = dto.partnerId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    return this.prisma.cheque.update({ where: { id }, data });
  }

  async remove(id: string, options?: { force?: boolean; userId?: string }) {
    const existing = await this.findOne(id);
    const force = options?.force === true;

    if (!force && existing.status !== 'PENDING') {
      throw new BadRequestException(
        'فقط چک‌های در جریان قابل حذف هستند',
      );
    }

    const reason = force
      ? 'Force delete cheque - reversal'
      : 'Delete cheque - reversal';

    const reversalDate = new Date();
    const reversedJournalIds: string[] = [];

    const journalIds = Array.from(
      new Set(
        [
          existing.issuedJournalEntryId,
          existing.settledJournalEntryId,
        ].filter(Boolean) as string[],
      ),
    );

    for (const journalId of journalIds) {
      const reversal = await this.journals.reverse(
        journalId,
        reason,
        reversalDate,
        '',
      );

      if (reversal?.id) {
        reversedJournalIds.push(reversal.id);
      }
    }

    // حذف خود چک مانند رفتار فعلی باقی می‌ماند.
    // حذف فیزیکی اسناد حسابداری کاملاً ممنوع است.
    await this.prisma.cheque.delete({
      where: { id },
    });

    return {
      success: true,
      hardDeleted: true,
      forced: force,
      reversedJournalIds,
    };
  }

  /** وصول چک (PASSED برای صادره، COLLECTED منطقاً ولی status=PASSED) */
  async pass(id: string, note?: string, userId?: string) {
    const c = await this.findOne(id);
    if (c.status !== 'PENDING') throw new BadRequestException('فقط چک در جریان قابل وصول است');
    const mappingCode = c.direction === 'ISSUED' ? 'CHEQUE_PASSED' : 'CHEQUE_COLLECTED';
    return this.settle(id, mappingCode, 'PASSED', { passedAt: new Date(), note }, userId);
  }

  /** برگشت چک */
  async return_(id: string, note?: string, userId?: string) {
    const c = await this.findOne(id);
    if (c.status !== 'PENDING') throw new BadRequestException('فقط چک در جریان قابل برگشت است');
    const mappingCode = c.direction === 'ISSUED' ? 'CHEQUE_RETURNED' : 'CHEQUE_RECEIVED_RETURNED';
    return this.settle(id, mappingCode, 'RETURNED', { returnedAt: new Date(), note }, userId);
  }

  /** ابطال چک */
  async cancel(id: string, note?: string, userId?: string) {
    const c = await this.findOne(id);
    if (c.status !== 'PENDING') throw new BadRequestException('فقط چک در جریان قابل ابطال است');
    const mappingCode = c.direction === 'ISSUED' ? 'CHEQUE_CANCELLED' : 'CHEQUE_RECEIVED_RETURNED';
    return this.settle(id, mappingCode, 'CANCELLED', { cancelledAt: new Date(), note }, userId);
  }

  private async settle(
    id: string,
    mappingCode: string,
    newStatus: 'PASSED' | 'RETURNED' | 'CANCELLED',
    extra: { passedAt?: Date; returnedAt?: Date; cancelledAt?: Date; note?: string },
    userId?: string,
  ) {
    const c = await this.findOne(id);
    const entry = await this.engine.postEvent(mappingCode, {
      amount: Number(c.amount),
      entryDate: new Date(),
      description: mappingCode + ' - ' + c.code,
      partnerId: c.partnerId ?? undefined,
      bankAccountId: c.bankAccountId ?? undefined,
      projectId: c.projectId ?? undefined,
      sourceId: c.id,
      userId,
      autoPost: true,
      });
    return this.prisma.cheque.update({
      where: { id },
      data: {
        status: newStatus,
        settledJournalEntryId: entry.id,
        ...extra,
      },
      include: {
        bankAccount: { select: { id: true, code: true, name: true } },
        partner: { select: { id: true, code: true, name: true } },
      },
    });
  }
}