import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreateCSDto, UpdateCSDto,
} from '../dto/client-statement.dto';

const CATEGORIES = ['MATERIAL', 'LABOR', 'MISC', 'TRANSPORT', 'EQUIPMENT'] as const;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
type Category = typeof CATEGORIES[number];

@Injectable()
export class ClientStatementCrudService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'CS-' + year + '-';
    const last = await this.prisma.clientStatement.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async nextStatementNumber(projectId: string): Promise<number> {
    const last = await this.prisma.clientStatement.findFirst({
      where: { projectId },
      orderBy: { statementNumber: 'desc' },
      select: { statementNumber: true },
      ...({ __withDeleted: true } as any),
    });
    return (last?.statementNumber || 0) + 1;
  }

  private computeTotals(
    items: { category: string; totalPrice: any }[],
    coefficient: number,
    prepaymentAmount: number,
    prepaymentDeductionPercent: number,
    overrides?: { contractorShareAmount?: number; netPayable?: number },
  ) {
    const subtotals: Record<Category, number> = {
      MATERIAL: 0, LABOR: 0, MISC: 0, TRANSPORT: 0, EQUIPMENT: 0,
    };
    for (const it of items) {
      const cat = it.category as Category;
      if (cat in subtotals) subtotals[cat] += Number(it.totalPrice);
    }
    const totalBeforeCoefficient =
      subtotals.MATERIAL + subtotals.LABOR + subtotals.MISC +
      subtotals.TRANSPORT + subtotals.EQUIPMENT;
    const totalAfterCoefficient = totalBeforeCoefficient * coefficient;
    const computedShare = totalAfterCoefficient - totalBeforeCoefficient;
    const contractorShareAmount = overrides?.contractorShareAmount !== undefined
      ? Number(overrides.contractorShareAmount)
      : computedShare;
    const prepaymentDeductionAmount = (prepaymentAmount * prepaymentDeductionPercent) / 100;
    const computedNet = contractorShareAmount - prepaymentDeductionAmount;
    const netPayable = overrides?.netPayable !== undefined
      ? Number(overrides.netPayable)
      : computedNet;
    return {
      subtotals, totalBeforeCoefficient, totalAfterCoefficient,
      contractorShareAmount, prepaymentDeductionAmount, netPayable,
    };
  }

  private async resolveContractData(projectId: string, contractId?: string | null) {
    if (contractId && UUID_RE.test(contractId)) {
      const c = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (c) return { coefficient: Number(c.coefficient), prepaymentAmount: Number(c.prepaymentAmount || 0) };
    }
    const c = await this.prisma.contract.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (c) return { coefficient: Number(c.coefficient), prepaymentAmount: Number(c.prepaymentAmount || 0) };
    return { coefficient: 1, prepaymentAmount: 0 };
  }

  async list(query?: { projectId?: string; status?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.clientStatement.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ periodEnd: 'desc' }, { statementNumber: 'desc' }],
    });
  }

  async get(id: string) {
    const s = await this.prisma.clientStatement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            clientId: true,
            addressFull: true,
            addressCity: true,
            addressProvince: true,
            client: { select: { id: true, name: true, nationalId: true } },
            consultant: { select: { id: true, name: true } },
          },
        },
        journalEntry: { select: { id: true, code: true, status: true } },
        items: {
          include: { wbsItem: { select: { id: true, code: true, title: true } } },
          orderBy: [{ category: 'asc' }, { rowNumber: 'asc' }],
        },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');

    // اطلاعات قرارداد (relation در schema نیست — query جداگانه)
    let contract: any = null;
    if (s.contractId) {
      contract = await this.prisma.contract.findUnique({
        where: { id: s.contractId },
        select: {
          id: true,
          code: true,
          taxPercent: true,
          baseAmount: true,
          prepaymentAmount: true,
          prepaymentDepreciationPercent: true,
        },
      });
    }

    // صورت‌وضعیت‌های قبلی همان پروژه/قرارداد که پرداخت شده‌اند
    const previousWhere: any = {
      projectId: s.projectId,
      id: { not: id },
      status: 'PAID',
      deletedAt: null,
    };
    if (s.contractId) previousWhere.contractId = s.contractId;
    const previousStatements = await this.prisma.clientStatement.findMany({
      where: previousWhere,
      select: {
        id: true,
        code: true,
        statementNumber: true,
        netPayable: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
      },
      orderBy: { statementNumber: 'asc' },
    });
    // هزینه‌های پاس‌تروگ باز (بسته‌نشده) برای کارفرمای این پروژه
    let passThroughOpenExpenses: any[] = [];
    let passThroughOpenAmount = 0;
    const clientId = s.project?.clientId || null;
    if (clientId) {
      passThroughOpenExpenses = await this.prisma.expense.findMany({
        where: {
          projectId: s.projectId,
          clientId,
          costType: 'CLIENT_PASS_THROUGH',
          passThroughClosedInStatementId: null,
          status: 'POSTED',
          deletedAt: null,
        },
        select: { id: true, code: true, totalAmount: true, expenseDate: true, description: true },
        orderBy: { expenseDate: 'asc' },
      });
      passThroughOpenAmount = passThroughOpenExpenses.reduce(
        (sum, e) => sum + Number(e.totalAmount),
        0,
      );
    }



    const totalPreviousPaid = previousStatements.reduce(
      (sum, p) => sum + Number(p.netPayable),
      0,
    );

    return {
      ...s,
      items: s.items,
      contract,
      previousStatements,
      totalPreviousPaid,
      passThroughOpenExpenses,
      passThroughOpenAmount,
    };
  }

  async create(dto: CreateCSDto) {
    let statementNumber = dto.statementNumber;
    if (!statementNumber) {
      statementNumber = await this.nextStatementNumber(dto.projectId);
    }
    const contractData = await this.resolveContractData(dto.projectId, dto.contractId);
    const coefficient = dto.coefficient ?? contractData.coefficient;
    const prepaymentDeductionPercent = dto.prepaymentDeductionPercent ?? 20;

    const items = (dto.items || []).map((it, idx) => ({
      category: it.category as any,
      rowNumber: idx + 1,
      priceListCode: it.priceListCode,
      description: it.description,
      unit: it.unit,
      unitPrice: it.unitPrice,
      quantity: it.quantity ?? 1,
      totalPrice: Number(it.unitPrice) * Number(it.quantity ?? 1),
      itemDate: it.itemDate ? new Date(it.itemDate) : null,
      wbsItemId: it.wbsItemId,
      notes: it.notes,
    }));

    const totals = this.computeTotals(items, coefficient, contractData.prepaymentAmount, prepaymentDeductionPercent, {
      contractorShareAmount: dto.contractorShareAmount,
      netPayable: dto.netPayable,
    });
    const code = await this.nextCode();

    return this.prisma.clientStatement.create({
      data: {
        code,
        projectId: dto.projectId,
        contractId: dto.contractId && UUID_RE.test(dto.contractId) ? dto.contractId : null,
        statementNumber,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        coefficient,
        contractorSharePercent: dto.contractorSharePercent ?? 7,
        prepaymentDeductionPercent,
        subtotalMaterial: totals.subtotals.MATERIAL,
        subtotalLabor: totals.subtotals.LABOR,
        subtotalMisc: totals.subtotals.MISC,
        subtotalTransport: totals.subtotals.TRANSPORT,
        subtotalEquipment: totals.subtotals.EQUIPMENT,
        totalBeforeCoefficient: totals.totalBeforeCoefficient,
        totalAfterCoefficient: totals.totalAfterCoefficient,
        contractorShareAmount: totals.contractorShareAmount,
        prepaymentDeductionAmount: totals.prepaymentDeductionAmount,
        netPayable: totals.netPayable,
        description: dto.description,
        status: 'DRAFT',
        items: { create: items as any },
      },
      include: {
        items: { orderBy: [{ category: 'asc' }, { rowNumber: 'asc' }] },
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async recompute(id: string) {
    const s = await this.prisma.clientStatement.findUnique({
      where: { id }, include: { items: true },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    const contractData = await this.resolveContractData(s.projectId, s.contractId);
    const totals = this.computeTotals(s.items, Number(s.coefficient), contractData.prepaymentAmount, Number(s.prepaymentDeductionPercent));
    return this.prisma.clientStatement.update({
      where: { id },
      data: {
        subtotalMaterial: totals.subtotals.MATERIAL,
        subtotalLabor: totals.subtotals.LABOR,
        subtotalMisc: totals.subtotals.MISC,
        subtotalTransport: totals.subtotals.TRANSPORT,
        subtotalEquipment: totals.subtotals.EQUIPMENT,
        totalBeforeCoefficient: totals.totalBeforeCoefficient,
        totalAfterCoefficient: totals.totalAfterCoefficient,
        contractorShareAmount: totals.contractorShareAmount,
        prepaymentDeductionAmount: totals.prepaymentDeductionAmount,
        netPayable: totals.netPayable,
      },
    });
  }

  async update(id: string, dto: UpdateCSDto) {
    const s = await this.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');
    const data: any = {};
    if (dto.periodStart) data.periodStart = new Date(dto.periodStart);
    if (dto.periodEnd) data.periodEnd = new Date(dto.periodEnd);
    if (dto.coefficient !== undefined) data.coefficient = dto.coefficient;
    if (dto.contractorSharePercent !== undefined) data.contractorSharePercent = dto.contractorSharePercent;
    if (dto.prepaymentDeductionPercent !== undefined) data.prepaymentDeductionPercent = dto.prepaymentDeductionPercent;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.contractId !== undefined) data.contractId = dto.contractId;
    await this.prisma.clientStatement.update({ where: { id }, data });

    if (dto.items) {
      await this.prisma.clientStatementItem.deleteMany({ where: { statementId: id } });
      const items = dto.items.map((it, idx) => ({
        statementId: id,
        category: it.category as any,
        rowNumber: idx + 1,
        priceListCode: it.priceListCode,
        description: it.description,
        unit: it.unit,
        unitPrice: it.unitPrice,
        quantity: it.quantity ?? 1,
        totalPrice: Number(it.unitPrice) * Number(it.quantity ?? 1),
        itemDate: it.itemDate ? new Date(it.itemDate) : null,
        wbsItemId: it.wbsItemId,
        notes: it.notes,
      }));
      await this.prisma.clientStatementItem.createMany({ data: items });
    }
    await this.recompute(id);
    return this.get(id);
  }

  async remove(id: string, userId?: string) {
    const s = await this.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.clientStatement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.clientStatement.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    if (!existing.deletedAt) throw new Error('صورت‌وضعیت حذف نشده است');
    await this.prisma.clientStatement.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.clientStatement.findUnique({
      where: { id },
      ...({ __withDeleted: true } as any),
    });
    if (!existing) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    if (existing.status !== 'DRAFT') {
      throw new Error('فقط پیش‌نویس قابل حذف قطعی است — چون تاییدشده سند حسابداری دارد');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.clientStatementItem.deleteMany({ where: { statementId: id } });
      await tx.clientStatement.delete({ where: { id } });
    });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.clientStatement.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        ...({ __withDeleted: true } as any),
      }),
      this.prisma.clientStatement.count({
        where: { deletedAt: { not: null } },
        ...({ __withDeleted: true } as any),
      }),
    ]);
    return { items, total, take, skip };
  }

  async stats(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    const [total, drafts, submitted, approved, paid, sum] = await Promise.all([
      this.prisma.clientStatement.count({ where }),
      this.prisma.clientStatement.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.clientStatement.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.clientStatement.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.clientStatement.count({ where: { ...where, status: 'PAID' } }),
      this.prisma.clientStatement.aggregate({
        where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { netPayable: true },
      }),
    ]);
    return { total, drafts, submitted, approved, paid, totalNetPayable: Number(sum._sum.netPayable || 0) };
  }
}
