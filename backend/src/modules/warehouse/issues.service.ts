import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from './stock.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.goodsIssue.count();
    return 'GIN-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { warehouseId?: string; projectId?: string; status?: string }) {
    const where: any = {};
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
    const r = await this.prisma.goodsIssue.findUnique({
      where: { id },
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

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط حواله پیش‌نویس قابل حذف است');
    await this.prisma.goodsIssue.delete({ where: { id } });
    return { success: true };
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
   * ثبت حواله → کسر از موجودی + الصاق به هزینه پروژه
   */
  async post(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'APPROVED') throw new BadRequestException('ابتدا حواله تایید شود');

    return this.prisma.$transaction(async (tx) => {
      let totalValue = 0;
      for (const it of r.items) {
        // دریافت بهای میانگین فعلی
        const stock = await tx.stock.findUnique({
          where: { warehouseId_itemId: { warehouseId: r.warehouseId, itemId: it.itemId } },
        });
        const avgCost = Number(stock?.avgCost || 0);
        const lineValue = Number(it.quantity) * avgCost;
        totalValue += lineValue;

        // به‌روزرسانی unitCost و totalCost در line
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
      }

      return tx.goodsIssue.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date(), totalValue },
      });
    });
  }
}
