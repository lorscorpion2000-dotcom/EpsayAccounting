import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from './stock.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { generateCode } from '../../shared/utils/code-generator';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
    private engine: AccountingEngineService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    return generateCode(this.prisma, 'goodsIssue', 'code', 'GIN-' + year + '-', { pad: 4 });
  }

  async findAll(query?: { warehouseId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    where.deletedAt = null;
    if (query?.warehouseId) where.warehouseId = query.warehouseId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    return this.prisma.goodsIssue.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        recipient: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.goodsIssue.findFirst({
      where: { id, deletedAt: null },
      include: {
        warehouse: true,
        project: { select: { id: true, code: true, name: true } },
        wbsItem: { select: { id: true, code: true, title: true } },
        recipient: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { item: { include: { category: true } } },
          orderBy: { rowNumber: 'asc' },
        },
        journalEntry: { select: { id: true, code: true, status: true } },
      },
    });
    if (!r) throw new NotFoundException('حواله انبار یافت نشد');
    return r;
  }

  /**
   * اعتبارسنجی موجودی
   */
  private async validateStock(warehouseId: string, items: any[], tx?: any) {
    const prisma = tx || this.prisma;
    for (const it of items) {
      const stock = await prisma.stock.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: it.itemId } },
        include: { item: { select: { name: true, code: true } } },
      });
      const available = Number(stock?.quantity || 0);
      if (available < Number(it.quantity)) {
        throw new BadRequestException(
          `موجودی «${stock?.item?.name || it.itemId}» کافی نیست. موجودی فعلی: ${available}`,
        );
      }
    }
  }

  async create(dto: CreateIssueDto, userId: string) {
    await this.validateStock(dto.warehouseId, dto.items);
    const code = await this.generateCode();

    return this.prisma.goodsIssue.create({
      data: {
        code,
        warehouseId: dto.warehouseId,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        recipientId: dto.recipientId,
        issueDate: new Date(dto.issueDate),
        requesterId: dto.requesterId,
        usageLocation: dto.usageLocation,
        notes: dto.notes,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: dto.items.map((it, idx) => ({
            itemId: it.itemId,
            rowNumber: idx + 1,
            quantity: it.quantity,
            unitCost: 0,
            totalCost: 0,
            notes: it.notes,
          })),
        },
      },
      include: {
        items: { include: { item: true }, orderBy: { rowNumber: 'asc' } },
        warehouse: true,
      },
    });
  }

  async update(id: string, dto: UpdateIssueDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط حواله پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.wbsItemId !== undefined) data.wbsItemId = dto.wbsItemId;
    if (dto.recipientId !== undefined) data.recipientId = dto.recipientId;
    if (dto.issueDate) data.issueDate = new Date(dto.issueDate);
    if (dto.usageLocation !== undefined) data.usageLocation = dto.usageLocation;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const whId = dto.warehouseId || r.warehouseId;
        await this.validateStock(whId, dto.items, tx);
        await tx.goodsIssueItem.deleteMany({ where: { issueId: id } });
        data.items = {
          create: dto.items.map((it, idx) => ({
            itemId: it.itemId,
            rowNumber: idx + 1,
            quantity: it.quantity,
            unitCost: 0,
            totalCost: 0,
            notes: it.notes,
          })),
        };
      }
      return tx.goodsIssue.update({
        where: { id },
        data,
        include: { items: { include: { item: true } } },
      });
    });
  }

  async remove(id: string, userId?: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط حواله پیش‌نویس قابل حذف است');
    await this.prisma.goodsIssue.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async submit(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (!r.items.length) throw new BadRequestException('حواله باید حداقل یک قلم داشته باشد');
    await this.validateStock(r.warehouseId, r.items);
    return this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'DRAFT', rejectedReason: reason },
    });
  }

  /**
   * ثبت حواله → کسر از موجودی + سند حسابداری (B3.b)
   */
  async post(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'APPROVED') throw new BadRequestException('ابتدا حواله تایید شود');

    // B3.b: idempotency
    const existing = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'GOODS_ISSUE', sourceId: r.id },
      select: { id: true, code: true },
    });
    if (existing) {
      if ((r.status as string) !== 'POSTED') {
        await this.prisma.goodsIssue.update({
          where: { id },
          data: { status: 'POSTED', postedAt: new Date() },
        });
      }
      return { success: true, alreadyPosted: true, journalCode: existing.code };
    }

    // B3.b: mapping
    const mapping = await this.prisma.accountMapping.findUnique({
      where: { code: 'GOODS_ISSUE' },
    });
    if (!mapping || !mapping.debitAccountId || !mapping.creditAccountId) {
      throw new BadRequestException('Mapping GOODS_ISSUE ناقص است');
    }
    const debitAccId = mapping.debitAccountId;
    const creditAccId = mapping.creditAccountId;

    return this.prisma.$transaction(async (tx) => {
      let totalValue = 0;
      const jeLines: any[] = [];

      for (const it of r.items) {
        const stock = await tx.stock.findUnique({
          where: { warehouseId_itemId: { warehouseId: r.warehouseId, itemId: it.itemId } },
        });
        const avgCost = Number(stock?.avgCost || 0);
        const lineValue = Number(it.quantity) * avgCost;
        totalValue += lineValue;

        await tx.goodsIssueItem.update({
          where: { id: it.id },
          data: { unitCost: avgCost, totalCost: lineValue },
        });

        await this.stock.applyMovement({
          warehouseId: r.warehouseId,
          itemId: it.itemId,
          type: 'OUT',
          quantity: Number(it.quantity),
          unitCost: avgCost,
          movementDate: r.issueDate,
          referenceType: 'goods-issue',
          referenceId: r.id,
          referenceCode: r.code,
          projectId: r.projectId || undefined,
          wbsItemId: r.wbsItemId || undefined,
          partnerId: r.recipientId || undefined,
          description: 'خروج کالا طبق حواله ' + r.code,
          createdById: userId,
          tx,
        });

        if (lineValue > 0.01) {
          jeLines.push({
            accountId: debitAccId,
            debit: lineValue,
            credit: 0,
            projectId: r.projectId || undefined,
            description: 'مصرف ' + ((it as any).item?.name || 'کالا') + ' طبق حواله ' + r.code,
          });
        }
      }

      // B3.b: post multi-line JE
      let journalCode: string | null = null;
      if (totalValue > 0.01 && jeLines.length > 0) {
        jeLines.push({
          accountId: creditAccId,
          debit: 0,
          credit: totalValue,
          description: 'خروج از انبار طبق حواله ' + r.code,
        });

        const je = await this.engine.postMultiLine('GOODS_ISSUE', {
          entryDate: r.issueDate.toISOString().slice(0, 10),
          description: 'حواله مصرف ' + r.code,
          reference: r.code,
          sourceId: r.id,
          userId,
          lines: jeLines,
        }, tx);
        journalCode = je.code;
        await tx.goodsIssue.update({
          where: { id },
          data: { journalEntryId: je.id },
        });
      }

      await tx.goodsIssue.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date(), totalValue },
      });

      return { success: true, journalCode, totalValue };
    });
  }
}
