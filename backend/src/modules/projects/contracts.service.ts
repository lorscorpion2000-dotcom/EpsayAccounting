import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
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
    return this.prisma.contract.findMany({
      where: projectId ? { projectId } : undefined,
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
        coefficient: dto.coefficient,
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
    const data: any = { ...dto };
    if (dto.signDate) data.signDate = new Date(dto.signDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.otherDeductions) data.otherDeductions = dto.otherDeductions;
    return this.prisma.contract.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contract.delete({ where: { id } });
    return { success: true };
  }
}
