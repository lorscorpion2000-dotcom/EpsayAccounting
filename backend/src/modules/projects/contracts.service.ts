import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { DeleteMeta } from '../../common/services/soft-delete.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.contract.count();
    return 'CTR-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(projectId?: string) {
    const where: Prisma.ContractWhereInput = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    return this.prisma.contract.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!c) throw new NotFoundException('قرارداد یافت نشد');
    return c;
  }

  async create(dto: CreateContractDto) {
    const code = await this.generateCode();
    const prepaymentAmount =
      dto.prepaymentAmount ??
      (dto.prepaymentPercent != null
        ? (Number(dto.baseAmount) * Number(dto.prepaymentPercent)) / 100
        : null);

    return this.prisma.contract.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type,
        status: dto.status,
        baseAmount: dto.baseAmount,
        coefficient: dto.coefficient ?? 1,
        signDate: dto.signDate ? new Date(dto.signDate) : null,
        durationValue: dto.durationValue,
        durationUnit: dto.durationUnit,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        paymentTerms: dto.paymentTerms,
        prepaymentPercent: dto.prepaymentPercent,
        prepaymentAmount,
        prepaymentDepreciationPercent: dto.prepaymentDepreciationPercent,
        insurancePercent: dto.insurancePercent ?? 7,
        taxPercent: dto.taxPercent ?? 3,
        retentionPercent: dto.retentionPercent ?? 5,
        otherDeductions: dto.otherDeductions ?? undefined,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);
    const data = { ...dto } as unknown as Prisma.ContractUncheckedUpdateInput;
    if (dto.signDate) data.signDate = new Date(dto.signDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.otherDeductions) data.otherDeductions = dto.otherDeductions;
    return this.prisma.contract.update({ where: { id }, data });
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
    });
    return { success: true, softDeleted: true };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.contract.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.ContractFindUniqueArgs);
    if (!existing) throw new NotFoundException('قرارداد یافت نشد');
    if (!existing.deletedAt) throw new Error('قرارداد حذف نشده است');
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId ?? null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, _meta: DeleteMeta = {}) {
    const existing = await this.prisma.contract.findUnique({
      where: { id },
      __withDeleted: true,
    } as unknown as Prisma.ContractFindUniqueArgs);
    if (!existing) throw new NotFoundException('قرارداد یافت نشد');
    await this.prisma.contract.delete({ where: { id } });
    return { ok: true, hardDeleted: true, id, by: userId ?? null, reason: reason ?? null };
  }

  async listDeleted(take = 100, skip = 0) {
    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: Math.min(take, 500),
        skip,
        __withDeleted: true,
      } as unknown as Prisma.ContractFindManyArgs),
      this.prisma.contract.count({
        where: { deletedAt: { not: null } },
        __withDeleted: true,
      } as unknown as Prisma.ContractCountArgs),
    ]);
    return { items, total, take, skip };
  }
  async complete(id: string) {
    await this.findOne(id);
    return this.prisma.contract.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.contract.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async terminate(id: string) {
    await this.findOne(id);
    return this.prisma.contract.update({ where: { id }, data: { status: 'TERMINATED' } });
  }

  async reactivate(id: string) {
    const c = await this.findOne(id);
    if (!['SUSPENDED', 'COMPLETED', 'TERMINATED'].includes(c.status)) {
      throw new Error('قرارداد در وضعیت پایانی نیست');
    }
    return this.prisma.contract.update({ where: { id }, data: { status: 'ACTIVE' } });
  }
}
