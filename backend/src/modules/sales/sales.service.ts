import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSalesUnitDto, UpdateSalesUnitDto } from './dto/create-unit.dto';
import {
  CreateSalesCustomerDto,
  UpdateSalesCustomerDto,
} from './dto/create-customer.dto';
import {
  CreateSalesContractDto,
  UpdateSalesContractDto,
} from './dto/create-sales-contract.dto';
import { CreateSalesPaymentDto } from './dto/create-payment.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async nextContractCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'SC-' + year + '-';
    const last = await this.prisma.salesContract.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  // ═══════════════════════════════════════════
  // Units
  // ═══════════════════════════════════════════
  listUnits(params: { projectId?: string; status?: string; search?: string }) {
    const where: any = {};
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { unitNumber: { contains: params.search, mode: 'insensitive' } },
        { block: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.salesUnit.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } } },
      orderBy: [{ projectId: 'asc' }, { block: 'asc' }, { unitNumber: 'asc' }],
    });
  }

  async getUnit(id: string) {
    const u = await this.prisma.salesUnit.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!u) throw new NotFoundException('واحد پیدا نشد');
    return u;
  }

  createUnit(dto: CreateSalesUnitDto) {
    return this.prisma.salesUnit.create({
      data: {
        projectId: dto.projectId,
        unitNumber: dto.unitNumber,
        block: dto.block,
        floor: dto.floor,
        area: dto.area,
        bedrooms: dto.bedrooms,
        parkingCount: dto.parkingCount,
        storageCount: dto.storageCount,
        listPrice: dto.listPrice,
        status: (dto.status as any) || 'AVAILABLE',
        notes: dto.notes,
      },
    });
  }

  async updateUnit(id: string, dto: UpdateSalesUnitDto) {
    await this.getUnit(id);
    return this.prisma.salesUnit.update({
      where: { id },
      data: { ...dto, status: dto.status as any },
    });
  }

  async cancelUnit(id: string) {
    await this.getUnit(id);
    return this.prisma.salesUnit.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ═══════════════════════════════════════════
  // Customers
  // ═══════════════════════════════════════════
  listCustomers(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
        { mobilePhone: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.salesCustomer.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getCustomer(id: string) {
    const c = await this.prisma.salesCustomer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('مشتری پیدا نشد');
    return c;
  }

  createCustomer(dto: CreateSalesCustomerDto) {
    return this.prisma.salesCustomer.create({ data: { ...dto, nationalId: dto.nationalId || null } });
  }

  async updateCustomer(id: string, dto: UpdateSalesCustomerDto) {
    await this.getCustomer(id);
    return this.prisma.salesCustomer.update({
      where: { id },
      data: { ...dto, nationalId: dto.nationalId || null },
    });
  }

  // ═══════════════════════════════════════════
  // Contracts
  // ═══════════════════════════════════════════
  listContracts(params: { status?: string; search?: string; unitId?: string; customerId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.unitId) where.unitId = params.unitId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { customer: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { unit: { unitNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.salesContract.findMany({
      where,
      include: {
        unit: { include: { project: { select: { id: true, name: true } } } },
        customer: true,
        _count: { select: { installments: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContract(id: string) {
    const c = await this.prisma.salesContract.findUnique({
      where: { id },
      include: {
        unit: { include: { project: { select: { id: true, name: true } } } },
        customer: true,
        installments: { orderBy: { sequence: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('قرارداد فروش پیدا نشد');
    return c;
  }

  async createContract(dto: CreateSalesContractDto) {
    const code = await this.nextContractCode();
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.salesContract.create({
        data: {
          code,
          status: 'DRAFT',
          unitId: dto.unitId,
          customerId: dto.customerId,
          totalPrice: dto.totalPrice,
          discountAmount: dto.discountAmount,
          finalPrice: dto.finalPrice,
          downPayment: dto.downPayment,
          contractDate: new Date(dto.contractDate),
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          bodyHtml: dto.bodyHtml,
          notes: dto.notes,
        },
      });
      if (dto.installments?.length) {
        await tx.salesInstallment.createMany({
          data: dto.installments.map((i) => ({
            contractId: contract.id,
            sequence: i.sequence,
            dueDate: new Date(i.dueDate),
            amount: i.amount,
            notes: i.notes,
          })),
        });
      }
      await tx.salesUnit.update({
        where: { id: dto.unitId },
        data: { status: 'RESERVED' },
      });
      return contract;
    });
  }

  async updateContract(id: string, dto: UpdateSalesContractDto) {
    await this.getContract(id);
    const data: any = { ...dto };
    if (dto.contractDate) data.contractDate = new Date(dto.contractDate);
    if (dto.deliveryDate) data.deliveryDate = new Date(dto.deliveryDate);
    delete data.installments;
    return this.prisma.salesContract.update({ where: { id }, data });
  }

  async activateContract(id: string) {
    const c = await this.getContract(id);
    await this.prisma.salesUnit.update({
      where: { id: c.unitId },
      data: { status: 'SOLD' },
    });
    return this.prisma.salesContract.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async cancelContract(id: string, reason: string) {
    if (!reason || !reason.trim()) throw new BadRequestException('دلیل ابطال الزامی است');
    const c = await this.getContract(id);
    await this.prisma.salesUnit.update({
      where: { id: c.unitId },
      data: { status: 'AVAILABLE' },
    });
    return this.prisma.salesContract.update({
      where: { id },
      data: { status: 'CANCELLED', cancellationReason: reason, cancelledAt: new Date() },
    });
  }

  // ═══════════════════════════════════════════
  // Payments
  // ═══════════════════════════════════════════
  listPayments(contractId?: string) {
    return this.prisma.salesPayment.findMany({
      where: contractId ? { contractId } : {},
      include: { contract: { select: { id: true, code: true } } },
      orderBy: { paidAt: 'desc' },
    });
  }

  async createPayment(dto: CreateSalesPaymentDto) {
    await this.getContract(dto.contractId);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.salesPayment.create({
        data: {
          contractId: dto.contractId,
          amount: dto.amount,
          paidAt: new Date(dto.paidAt),
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          bankName: dto.bankName,
          notes: dto.notes,
        },
      });

      // به‌روزرسانی اقساط بر اساس FIFO
      let remaining = Number(dto.amount);
      const installments = await tx.salesInstallment.findMany({
        where: { contractId: dto.contractId, status: { not: 'PAID' } },
        orderBy: { sequence: 'asc' },
      });
      for (const inst of installments) {
        if (remaining <= 0) break;
        const owed = Number(inst.amount) - Number(inst.paidAmount);
        const pay = Math.min(owed, remaining);
        const newPaid = Number(inst.paidAmount) + pay;
        await tx.salesInstallment.update({
          where: { id: inst.id },
          data: {
            paidAmount: newPaid,
            status: newPaid >= Number(inst.amount) ? 'PAID' : 'PENDING',
            paidAt: newPaid >= Number(inst.amount) ? new Date(dto.paidAt) : null,
          },
        });
        remaining -= pay;
      }

      return payment;
    });
  }

  // ═══════════════════════════════════════════
  // Dashboard summary
  // ═══════════════════════════════════════════
  async summary() {
    const [unitsAvailable, unitsSold, contractsActive, contractsDraft] = await Promise.all([
      this.prisma.salesUnit.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.salesUnit.count({ where: { status: 'SOLD' } }),
      this.prisma.salesContract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.salesContract.count({ where: { status: 'DRAFT' } }),
    ]);
    return { unitsAvailable, unitsSold, contractsActive, contractsDraft };
  }
}
