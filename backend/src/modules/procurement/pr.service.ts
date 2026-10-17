import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePRDto } from './dto/create-pr.dto';
import { UpdatePRDto } from './dto/update-pr.dto';

@Injectable()
export class PurchaseRequestsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PR-' + year + '-';

    const last = await (this.prisma as any).purchaseRequest.findFirst({
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
      const exists = await (this.prisma as any).purchaseRequest.findFirst({
        __withDeleted: true,
        where: { code: candidate },
        select: { code: true },
      });
      if (!exists) return candidate;
      tries++;
      lastNum++;
      candidate = prefix + String(lastNum + 1).padStart(4, '0');
    }
    throw new Error('Cannot generate unique code for PR');
  }

  async findAll(query?: { status?: string; projectId?: string; search?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.purchaseRequest.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        requester: { select: { id: true, fullName: true } },
        _count: { select: { items: true, rfqs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        wbsItem: { select: { id: true, code: true, title: true } },
        requester: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { orderBy: { rowNumber: 'asc' } },
        rfqs: { select: { id: true, code: true, status: true, _count: { select: { responses: true } } } },
      },
    });
    if (!pr) throw new NotFoundException('درخواست خرید یافت نشد');
    return pr;
  }


  private async resolveUnitIds(codes: (string | null | undefined)[], client: any = this.prisma): Promise<Map<string, string>> {
    const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
    if (unique.length === 0) return new Map();
    const units = await client.unit.findMany({
      where: { OR: [{ code: { in: unique } }, { name: { in: unique } }, { symbol: { in: unique } }] },
      select: { id: true, code: true, name: true, symbol: true },
    });
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.code && unique.includes(u.code)) map.set(u.code, u.id);
      if (u.name && unique.includes(u.name)) map.set(u.name, u.id);
      if (u.symbol && unique.includes(u.symbol)) map.set(u.symbol, u.id);
    }
    return map;
  }

  async create(dto: CreatePRDto, userId: string) {
    const code = await this.generateCode();
    const prUnitMap = await this.resolveUnitIds(dto.items.map((it) => it.unit as any));
    return this.prisma.purchaseRequest.create({
      data: {
        code,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        requestDate: new Date(dto.requestDate),
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : null,
        requesterId: userId,
        department: dto.department,
        deliveryLocation: dto.deliveryLocation,
        reason: dto.reason,
        status: 'DRAFT',
        createdById: userId,
        items: {
          create: dto.items.map((it, idx) => ({
            rowNumber: idx + 1,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit as any,
            unitId: it.unit ? (prUnitMap.get(it.unit) ?? null) : null,
            priority: (it.priority as any) || 'NORMAL',
            notes: it.notes,
          })),
        },
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdatePRDto) {
    const pr = await this.findOne(id);
    if (pr.status !== 'DRAFT') {
      throw new BadRequestException('فقط درخواست‌های پیش‌نویس قابل ویرایش هستند');
    }

    const data: any = {};
    if (dto.wbsItemId !== undefined) data.wbsItemId = dto.wbsItemId;
    if (dto.requestDate) data.requestDate = new Date(dto.requestDate);
    if (dto.requiredDate !== undefined) data.requiredDate = dto.requiredDate ? new Date(dto.requiredDate) : null;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.deliveryLocation !== undefined) data.deliveryLocation = dto.deliveryLocation;
    if (dto.reason !== undefined) data.reason = dto.reason;

    const prUpdateUnitMap = dto.items ? await this.resolveUnitIds(dto.items.map((it) => it.unit as any)) : new Map<string, string>();
    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseRequestItem.deleteMany({ where: { prId: id } });
        data.items = {
          create: dto.items.map((it, idx) => ({
            rowNumber: idx + 1,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit as any,
            unitId: it.unit ? (prUpdateUnitMap.get(it.unit) ?? null) : null,
            priority: (it.priority as any) || 'NORMAL',
            notes: it.notes,
          })),
        };
      }
      return tx.purchaseRequest.update({
        where: { id },
        data,
        include: { items: { orderBy: { rowNumber: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    const pr = await this.findOne(id);
    if (pr.status !== 'DRAFT') {
      throw new BadRequestException('فقط درخواست‌های پیش‌نویس قابل حذف هستند');
    }
    await this.prisma.purchaseRequest.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const pr = await this.findOne(id);
    if (pr.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (!pr.items.length) throw new BadRequestException('درخواست باید حداقل یک قلم داشته باشد');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const pr = await this.findOne(id);
    if (pr.status !== 'SUBMITTED') throw new BadRequestException('فقط درخواست‌های ارسال‌شده قابل تایید هستند');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string, _userId: string) {
    const pr = await this.findOne(id);
    if (pr.status !== 'SUBMITTED') throw new BadRequestException('فقط درخواست‌های ارسال‌شده قابل رد هستند');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) throw new Error('قبلاً حذف شده است');
    await this.prisma.purchaseRequest.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');
    await this.prisma.purchaseRequest.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });
    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }

}
