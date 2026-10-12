import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JournalsService } from '../journals.service';
import { FiscalYearsService } from '../fiscal-years.service';
import { PostEventPayload } from './dto/post-event.dto';

@Injectable()
export class AccountingEngineService {
  private readonly logger = new Logger(AccountingEngineService.name);

  constructor(
    private prisma: PrismaService,
    private journals: JournalsService,
    private fiscalYears: FiscalYearsService,
  ) {}

  /**
   * هستهٔ موتور: با گرفتن type رویداد + payload، سند خودکار می‌سازد.
   */
  async postEvent(sourceType: string, payload: PostEventPayload, tx?: Prisma.TransactionClient) {
    const mapping = await this.prisma.accountMapping.findUnique({
      where: { code: sourceType },
      include: { debitAccount: true, creditAccount: true },
    });
    if (!mapping) {
      throw new BadRequestException(`Mapping "${sourceType}" not found`);
    }
    if (!mapping.isActive) {
      throw new BadRequestException(`Mapping "${sourceType}" is inactive`);
    }
    if (!mapping.debitAccount || !mapping.creditAccount) {
      throw new BadRequestException(`Mapping "${sourceType}" is incomplete`);
    }

    const debitAcc = payload.debitAccountId
      ? await this.loadExplicitAccount(payload.debitAccountId)
      : await this.resolveAccount(mapping.debitAccount, payload, payload.debitDetailId);
    const creditAcc = payload.creditAccountId
      ? await this.loadExplicitAccount(payload.creditAccountId)
      : await this.resolveAccount(mapping.creditAccount, payload, payload.creditDetailId);

    const entryDate = new Date(payload.entryDate);
    const fy = await this.fiscalYears.assertPeriodOpen(entryDate, tx);

    const dto: any = {
      fiscalYearId: fy.id,
      entryDate: entryDate.toISOString().slice(0, 10),
      description: payload.description ?? mapping.title,
      reference: payload.reference,
      lines: [
        {
          accountId: debitAcc.id,
          debit: payload.amount,
          credit: 0,
          description: payload.description,
          partnerId: payload.partnerId,
          projectId: payload.projectId,
        },
        {
          accountId: creditAcc.id,
          debit: 0,
          credit: payload.amount,
          description: payload.description,
          partnerId: payload.partnerId,
          projectId: payload.projectId,
        },
      ],
    };

    const entry = await this.journals.create(dto, payload.userId, {
      sourceType,
      sourceId: payload.sourceId,
    }, tx);

    // B3.a: auto-post (in tx if provided)
    if (payload.autoPost && payload.userId) {
      if (tx) {
        const posted = await tx.journalEntry.update({
          where: { id: entry.id },
          data: { status: 'POSTED', postedAt: new Date() },
        });
        this.logger.log('[' + sourceType + '] Auto-posted ' + posted.code + ' (in tx)');
        return posted;
      }
      const posted = await this.journals.post(entry.id, payload.userId);
      this.logger.log('[' + sourceType + '] Auto-posted ' + posted.code);
      return posted;
    }

    this.logger.log(
      `[${sourceType}] Journal ${entry.code} created (Dr ${debitAcc.code} / Cr ${creditAcc.code})`,
    );
    return entry;
  }

  /**
   * ساخت سند چندخطی — برای رویدادهایی مثل صورت‌وضعیت
   * که شامل کسورات و چند حساب هستند.
   */
  async postMultiLine(
    sourceType: string,
    payload: {
      entryDate: string;
      description: string;
      reference?: string;
      sourceId?: string;
      lines: Array<{
        accountId: string;
        debit?: number;
        credit?: number;
        description?: string;
        partnerId?: string;
        projectId?: string;
        costCenterId?: string;
      }>;
      userId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (!payload.lines || payload.lines.length < 2) {
      throw new BadRequestException('سند باید حداقل دو خط داشته باشد');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of payload.lines) {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    }
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        'سند تراز نیست: Dr=' + totalDebit + ' Cr=' + totalCredit,
      );
    }

    for (const l of payload.lines) {
      const acc = await this.prisma.account.findUnique({ where: { id: l.accountId } });
      if (!acc || !acc.isActive) {
        throw new BadRequestException('حساب ' + l.accountId + ' یافت نشد یا غیرفعال است');
      }
      if (!acc.isPostable) {
        throw new BadRequestException('حساب ' + acc.code + ' postable نیست');
      }
    }

    const entryDate = new Date(payload.entryDate);
    const fy = await this.fiscalYears.assertPeriodOpen(entryDate, tx);

    const dto: any = {
      fiscalYearId: fy.id,
      entryDate: entryDate.toISOString().slice(0, 10),
      description: payload.description,
      reference: payload.reference,
      lines: payload.lines.map((l, i) => ({
        accountId: l.accountId,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description,
        partnerId: l.partnerId,
        projectId: l.projectId,
        costCenterId: l.costCenterId,
        sortOrder: i,
      })),
    };

    const entry = await this.journals.create(dto, payload.userId, {
      sourceType,
      sourceId: payload.sourceId,
    }, tx);

    // ═══ auto-post: سند خودکار مستقیماً قطعی می‌شود ═══
    // B3.b: multi-line auto-post in tx
    const autoPost = (payload as any).autoPost !== false;
    if (autoPost && payload.userId) {
      if (tx) {
        const posted = await tx.journalEntry.update({
          where: { id: entry.id },
          data: { status: 'POSTED', postedAt: new Date() },
        });
        this.logger.log('[' + sourceType + '] Auto-posted ' + posted.code + ' (in tx)');
        return posted;
      }
      try {
        const posted = await this.journals.post(entry.id, payload.userId);
        this.logger.log('[' + sourceType + '] Auto-posted ' + posted.code);
        return posted;
      } catch (e: any) {
        this.logger.warn('[' + sourceType + '] Auto-post failed for ' + entry.code + ': ' + e?.message);
        return entry;
      }
    }

    this.logger.log(
      '[' + sourceType + '] Multi-line Journal ' + entry.code +
      ' (' + payload.lines.length + ' lines)',
    );
    return entry;
  }

  /**
   * اگه حساب mapped، postable نبود، تلاش می‌کنیم تفضیل متناظر با context رو پیدا کنیم.
   * اولویت: explicit override > partnerId > pettyCashId > salesCustomerId
   */
  private async loadExplicitAccount(id: string) {
    const acc = await this.prisma.account.findUnique({ where: { id } });
    if (!acc || !acc.isActive || !acc.isPostable) {
      throw new BadRequestException(
        `Explicit account ${id} is not usable for posting`,
      );
    }
    return acc;
  }

  private async resolveAccount(
    base: any,
    ctx: PostEventPayload,
    explicitDetailId?: string,
  ) {
    // 1) explicit override
    if (explicitDetailId) {
      const detail = await this.prisma.account.findFirst({
        where: {
          parentId: base.id,
          detailId: explicitDetailId,
          isActive: true,
          isPostable: true,
        },
      });
      if (detail) return detail;
      throw new BadRequestException(
        `Explicit detail ${explicitDetailId} not found under ${base.code}`,
      );
    }

    // 2) base is postable
    if (base.isPostable && base.isActive) return base;

    // 3) try context hints
    const hints: Array<string | undefined> = [
      ctx.partnerId,
      ctx.pettyCashId,
      ctx.salesCustomerId,
        ctx.bankAccountId,
      ].filter(Boolean) as string[];

    for (const detailId of hints) {
      const detail = await this.prisma.account.findFirst({
        where: {
          parentId: base.id,
          detailId,
          isActive: true,
          isPostable: true,
        },
      });
      if (detail) return detail;
    }

    throw new BadRequestException(
      `Account ${base.code} is not postable and no detail matched this event`,
    );
  }

}