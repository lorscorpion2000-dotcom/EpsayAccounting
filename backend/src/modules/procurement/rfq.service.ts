import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRFQDto } from './dto/create-rfq.dto';
import { CreateRFQResponseDto } from './dto/create-rfq-response.dto';
import { SelectSupplierDto } from './dto/select-supplier.dto';

@Injectable()
export class RFQService {
  constructor(private prisma: PrismaService) {}

  private get prismaWithDeleted() {
    return this.prisma as unknown as {
      rFQ: {
        findFirst: (args: unknown) => Promise<{ code: string } | null>;
      };
    };
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'RFQ-' + year + '-';

    const last = await this.prismaWithDeleted.rFQ.findFirst({
      __withDeleted: true,
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let lastNum = 0;
    if (last && last.code) {
      const m = String(last.code).match(new RegExp('^' + prefix + '(\\d+)$'));
      if (m) lastNum = parseInt(m[1], 10) || 0;
    }

    let candidate = prefix + String(lastNum + 1).padStart(4, '0');
    let tries = 0;
    while (tries < 100) {
      const exists = await this.prismaWithDeleted.rFQ.findFirst({
        __withDeleted: true,
        where: { code: candidate },
        select: { code: true },
      });
      if (!exists) return candidate;
      tries++;
      lastNum++;
      candidate = prefix + String(lastNum + 1).padStart(4, '0');
    }
    throw new Error('Cannot generate unique code for RFQ');
  }

  async findAll(query?: { prId?: string }) {
    return this.prisma.rFQ.findMany({
      where: query?.prId ? { prId: query.prId } : undefined,
      include: {
        pr: { select: { id: true, code: true, projectId: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: {
        pr: {
          include: {
            items: { orderBy: { rowNumber: 'asc' } },
            project: { select: { id: true, code: true, name: true } },
          },
        },
        responses: {
          include: {
            supplier: { select: { id: true, code: true, name: true, phone: true } },
            items: { include: { prItem: true } },
          },
        },
      },
    });
    if (!rfq) throw new NotFoundException('استعلام یافت نشد');
    return rfq;
  }

  async create(dto: CreateRFQDto, userId: string) {
    // بررسی وضعیت PR
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id: dto.prId } });
    if (!pr) throw new NotFoundException('درخواست خرید یافت نشد');
    if (pr.status !== 'APPROVED') {
      throw new BadRequestException('فقط درخواست‌های تاییدشده قابل استعلام هستند');
    }

    const code = await this.generateCode();

    return this.prisma.$transaction(async (tx) => {
      const rfq = await tx.rFQ.create({
        data: {
          code,
          prId: dto.prId,
          rfqDate: new Date(dto.rfqDate),
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          minSuppliers: dto.minSuppliers ?? 3,
          notes: dto.notes,
          status: 'OPEN',
          createdById: userId,
          responses: {
            create: dto.suppliers.map((s) => ({
              supplierId: s.supplierId,
              totalAmount: 0,
            })),
          },
        },
        include: { responses: { include: { supplier: true } } },
      });

      // به‌روزرسانی وضعیت PR
      await tx.purchaseRequest.update({
        where: { id: dto.prId },
        data: { status: 'IN_RFQ' },
      });

      return rfq;
    });
  }

  async addResponse(dto: CreateRFQResponseDto, _userId: string) {
    const rfq = await this.findOne(dto.rfqId);
    if (rfq.status !== 'OPEN') throw new BadRequestException('استعلام بسته شده است');

    // محاسبه مجموع
    let totalAmount = 0;
    const items = dto.items.map((it) => {
      const prItem = rfq.pr.items.find((p) => p.id === it.prItemId);
      if (!prItem) throw new BadRequestException('قلم ' + it.prItemId + ' یافت نشد');
      const total = Number(it.unitPrice) * Number(prItem.quantity);
      totalAmount += total;
      return {
        prItemId: it.prItemId,
        unitPrice: it.unitPrice,
        totalPrice: total,
        deliveryDays: it.deliveryDays,
        notes: it.notes,
      };
    });

    // بررسی وجود Response قبلی برای این تأمین‌کننده
    const existing = rfq.responses.find((r) => r.supplierId === dto.supplierId);

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.rFQResponseItem.deleteMany({ where: { rfqResponseId: existing.id } });
        return tx.rFQResponse.update({
          where: { id: existing.id },
          data: {
            respondedAt: new Date(),
            totalAmount,
            items: { create: items },
          },
          include: { items: true, supplier: true },
        });
      } else {
        return tx.rFQResponse.create({
          data: {
            rfqId: dto.rfqId,
            supplierId: dto.supplierId,
            respondedAt: new Date(),
            totalAmount,
            items: { create: items },
          },
          include: { items: true, supplier: true },
        });
      }
    });
  }

  async selectSupplier(dto: SelectSupplierDto, _userId: string) {
    const response = await this.prisma.rFQResponse.findUnique({
      where: { id: dto.rfqResponseId },
      include: { rfq: true },
    });
    if (!response) throw new NotFoundException('پاسخ استعلام یافت نشد');
    if (response.rfq.status !== 'OPEN') throw new BadRequestException('استعلام بسته شده است');

    return this.prisma.$transaction(async (tx) => {
      // لغو انتخاب‌های قبلی
      await tx.rFQResponse.updateMany({
        where: { rfqId: response.rfqId },
        data: { isSelected: false },
      });

      // انتخاب جدید
      const updated = await tx.rFQResponse.update({
        where: { id: dto.rfqResponseId },
        data: {
          isSelected: true,
          selectedAt: new Date(),
          selectionNotes: dto.notes,
        },
        include: { supplier: true, items: true },
      });

      // بستن استعلام و به‌روزرسانی PR
      await tx.rFQ.update({
        where: { id: response.rfqId },
        data: { status: 'CLOSED' },
      });

      await tx.purchaseRequest.update({
        where: { id: response.rfq.prId },
        data: { status: 'RFQ_COMPLETED' },
      });

      return updated;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CRUD extras — soft delete, restore, admin delete
  // Auto-generated by patch-crud-9.mjs
  // ═══════════════════════════════════════════════════════════

  async softDelete(id: string, userId?: string, reason?: string, _meta: Record<string, unknown> = {}) {
    const existing = await this.prisma.rFQ.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (existing.deletedAt) throw new Error('قبلاً حذف شده است');

    await this.prisma.rFQ.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      },
    });

    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.rFQ.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!existing.deletedAt) throw new Error('رکورد حذف نشده است');

    await this.prisma.rFQ.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });

    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: Record<string, unknown> = {}) {
    // For hard delete by admin — soft delete first then optionally purge
    // For safety we only do soft delete by default; uncomment hard delete below if needed
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }

}
