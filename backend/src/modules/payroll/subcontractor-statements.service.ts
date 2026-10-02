import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSubcontractorStatementDto } from './dto/subcontractor-statement.dto';

@Injectable()
export class SubcontractorStatementsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.subcontractorStatement.count();
    return 'SS-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; contractorId?: string; status?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.contractorId) where.contractorId = query.contractorId;
    if (query?.status) where.status = query.status;
    return this.prisma.subcontractorStatement.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        contractor: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.subcontractorStatement.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        contractor: true,
        approvedBy: { select: { id: true, fullName: true } },
        items: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    return s;
  }

  private computeTotals(dto: CreateSubcontractorStatementDto) {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const insurancePercent = dto.insurancePercent ?? 7;
    const taxPercent = dto.taxPercent ?? 3;
    const retentionPercent = dto.retentionPercent ?? 5;
    const prepaymentPercent = dto.prepaymentPercent ?? 0;
    const prepaymentDepreciation = dto.prepaymentDepreciation ?? 0;
    const otherDeduction = dto.otherDeduction ?? 0;

    const insuranceAmount = (totalAmount * insurancePercent) / 100;
    const taxAmount = (totalAmount * taxPercent) / 100;
    const retentionAmount = (totalAmount * retentionPercent) / 100;
    const prepaymentAmount = (totalAmount * prepaymentPercent) / 100;

    const totalDeduction =
      insuranceAmount +
      taxAmount +
      retentionAmount +
      prepaymentDepreciation +
      otherDeduction;

    const netPayable = totalAmount - totalDeduction;

    return {
      totalAmount,
      insuranceAmount,
      taxAmount,
      retentionAmount,
      prepaymentAmount,
      totalDeduction,
      netPayable,
    };
  }

  async create(dto: CreateSubcontractorStatementDto, userId: string) {
    const code = await this.generateCode(dto.projectId);
    const totals = this.computeTotals(dto);

    return this.prisma.subcontractorStatement.create({
      data: {
        code,
        contractorId: dto.contractorId,
        projectId: dto.projectId,
        statementNumber: dto.statementNumber,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        totalAmount: totals.totalAmount,
        prepaymentPercent: dto.prepaymentPercent ?? 0,
        prepaymentAmount: totals.prepaymentAmount,
        prepaymentDepreciation: dto.prepaymentDepreciation ?? 0,
        insurancePercent: dto.insurancePercent ?? 7,
        insuranceAmount: totals.insuranceAmount,
        taxPercent: dto.taxPercent ?? 3,
        taxAmount: totals.taxAmount,
        retentionPercent: dto.retentionPercent ?? 5,
        retentionAmount: totals.retentionAmount,
        otherDeduction: dto.otherDeduction ?? 0,
        totalDeduction: totals.totalDeduction,
        netPayable: totals.netPayable,
        description: dto.description,
        createdById: userId,
        items: {
          create: dto.items.map((item, idx) => ({
            rowNumber: idx + 1,
            wbsItemId: item.wbsItemId,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            notes: item.notes,
          })),
        },
      },
      include: { items: { orderBy: { rowNumber: 'asc' } } },
    });
  }

  async update(id: string, dto: Partial<CreateSubcontractorStatementDto>) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.contractorId) data.contractorId = dto.contractorId;
      if (dto.projectId) data.projectId = dto.projectId;
      if (dto.statementNumber) data.statementNumber = dto.statementNumber;
      if (dto.periodStart) data.periodStart = new Date(dto.periodStart);
      if (dto.periodEnd) data.periodEnd = new Date(dto.periodEnd);
      if (dto.description !== undefined) data.description = dto.description;

      if (dto.items) {
        await tx.subcontractorStatementItem.deleteMany({ where: { statementId: id } });

        const fullDto = { ...s, ...dto, items: dto.items } as any;
        const totals = this.computeTotals(fullDto);

        data.totalAmount = totals.totalAmount;
        data.insuranceAmount = totals.insuranceAmount;
        data.taxAmount = totals.taxAmount;
        data.retentionAmount = totals.retentionAmount;
        data.totalDeduction = totals.totalDeduction;
        data.netPayable = totals.netPayable;

        data.items = {
          create: dto.items.map((item, idx) => ({
            rowNumber: idx + 1,
            wbsItemId: item.wbsItemId,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            notes: item.notes,
          })),
        };
      }

      return tx.subcontractorStatement.update({
        where: { id },
        data,
        include: { items: { orderBy: { rowNumber: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.subcontractorStatement.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const s = await this.findOne(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async markPaid(id: string) {
    const s = await this.findOne(id);
    if (s.status !== 'APPROVED') throw new BadRequestException('ابتدا تایید شود');
    return this.prisma.subcontractorStatement.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async stats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const [total, draft, submitted, approved, paid] = await Promise.all([
      this.prisma.subcontractorStatement.count({ where }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'SUBMITTED' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.subcontractorStatement.count({ where: { ...where, status: 'PAID' } }),
    ]);
    return { total, draft, submitted, approved, paid };
  }
}
