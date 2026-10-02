import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StockService } from './stock.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.goodsReceipt.count();
    return 'GRN-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { warehouseId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    if (query?.warehouseId) where.warehouseId = query.warehouseId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    return this.prisma.goodsReceipt.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        project: { select: { id: true, code: true, name: true } },
        supplier: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: { item: { include: { category: true } } },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!r) throw new NotFoundException('رسید انبار یافت نشد');
    return r;
  }

  async create(dto: CreateReceiptDto, userId: string) {
    const code = await this.generateCode();
    const totalValue = dto.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);

    return this.prisma.goodsReceipt.create({
      data: {
        code,
        warehouseId: dto.warehouseId,
        projectId: dto.projectId,
        supplierId: dto.supplierId,
        poId: dto.poId,
        prId: dto.prId,
        receiptDate: new Date(dto.receiptDate),
        reference: dto.reference,
        driverName: dto.driverName,
        vehiclePlate: dto.vehiclePlate,
        notes: dto.notes,
        totalValue,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: dto.items.map((it, idx) => ({
            itemId: it.itemId,
            rowNumber: idx + 1,
            quantity: it.quantity,
            unitCost: it.unitCost,
            totalCost: it.quantity * it.unitCost,
            notes: it.notes,
          })),
        },
      },
      include: {
        items: { include: { item: true }, orderBy: { rowNumber: 'asc' } },
        warehouse: true,
        supplier: true,
      },
    });
  }

  async update(id: string, dto: UpdateReceiptDto) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط رسید پیش‌نویس قابل ویرایش است');

    const data: any = {};
    if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId;
    if (dto.receiptDate) data.receiptDate = new Date(dto.receiptDate);
    if (dto.reference !== undefined) data.reference = dto.reference;
    if (dto.driverName !== undefined) data.driverName = dto.driverName;
    if (dto.vehiclePlate !== undefined) data.vehiclePlate = dto.vehiclePlate;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const totalValue = dto.items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
        data.totalValue = totalValue;
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        data.items = {
          create: dto.items.map((it, idx) => ({
            itemId: it.itemId,
            rowNumber: idx + 1,
            quantity: it.quantity,
            unitCost: it.unitCost,
            totalCost: it.quantity * it.unitCost,
            notes: it.notes,
          })),
        };
      }
      return tx.goodsReceipt.update({
        where: { id },
        data,
        include: { items: { include: { item: true } } },
      });
    });
  }

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط رسید پیش‌نویس قابل حذف است');
    await this.prisma.goodsReceipt.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const r = await this.findOne(id);
    if (r.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (!r.items.length) throw new BadRequestException('رسید باید حداقل یک قلم داشته باشد');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string, reason: string) {
    const r = await this.findOne(id);
    if (r.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }



  /**
   * ثبت رسید → اعمال موجودی
   */
  async post(id: string, userId: string) {
    const r = await this.findOne(id);
    if (r.status !== 'APPROVED') throw new BadRequestException('ابتدا رسید باید تایید شود');

    return this.prisma.$transaction(async (tx) => {
      for (const it of r.items) {
        await this.stock.applyMovement({
          warehouseId: r.warehouseId,
          itemId: it.itemId,
          type: 'IN',
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          movementDate: r.receiptDate,
          referenceType: 'goods-receipt',
          referenceId: r.id,
          referenceCode: r.code,
          projectId: r.projectId || undefined,
          partnerId: r.supplierId || undefined,
          description: 'ورود کالا طبق رسید ' + r.code,
          createdById: userId,
          tx,
        });
      }

      return tx.goodsReceipt.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    });
  }
}
