import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountDetailType } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DetailAccountsService } from '../accounting/detail-accounts.service';
import { AccountingEngineService } from '../accounting/engine/accounting-engine.service';
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
  constructor(
    private prisma: PrismaService,
    private detailAccounts: DetailAccountsService,
    private engine: AccountingEngineService,
  ) {}

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
    const where: any = { isActive: true };
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
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.salesCustomer.create({
        data: { ...dto, nationalId: dto.nationalId || null },
      });

      // ─── تفضیل خودکار مشتری زیر معین 1.1.2 ───
      try {
        await this.detailAccounts.ensureDetailAccount(tx as any, {
          detailType: AccountDetailType.CUSTOMER,
          entityId: customer.id,
          entityName: customer.fullName,
        });
      } catch (err) {
        console.error('[SalesService] Failed to create detail account for customer:', err);
      }

      return customer;
    });
  }

  async updateCustomer(id: string, dto: UpdateSalesCustomerDto) {
    await this.getCustomer(id);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.salesCustomer.update({
        where: { id },
        data: { ...dto, nationalId: dto.nationalId || null },
      });

      // ─── همگامسازی نام تفضیل با نام مشتری ───
      if (dto.fullName) {
        const existingDetail = await tx.account.findFirst({
          where: { detailType: AccountDetailType.CUSTOMER, detailId: id } as any,
        });
        if (existingDetail && existingDetail.name !== dto.fullName) {
          await tx.account.update({
            where: { id: existingDetail.id },
            data: { name: dto.fullName },
          });
        }
      }

      return customer;
    });
  }

  // ═══════════════════════════════════════════
  async removeCustomer(id: string, options?: { force?: boolean }) {
    await this.getCustomer(id);
    const force = options?.force === true;

    if (!force) {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.salesCustomer.update({ where: { id }, data: { isActive: false } });
        const acc = await tx.account.findFirst({ where: { detailType: 'CUSTOMER', detailId: id } });
        if (acc) await tx.account.update({ where: { id: acc.id }, data: { isActive: false } });
        return { success: true, softDeleted: true };
      });
    }

    // force (admin)
    const refs = await this.countCustomerRefs(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'CUSTOMER_HAS_REFS',
        message: '\u0645\u0634\u062a\u0631\u06cc \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647:\n' + details,
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.account.deleteMany({ where: { detailType: 'CUSTOMER', detailId: id } });
      await tx.salesCustomer.delete({ where: { id } });
    });
    return { success: true, hardDeleted: true };
  }

  private async countCustomerRefs(id: string) {
    const p = this.prisma;
    const [contracts, invoices, receipts] = await Promise.all([
      (p as any).salesContract.count({ where: { customerId: id } }).catch(() => 0),
      (p as any).salesInvoice.count({ where: { customerId: id } }).catch(() => 0),
      (p as any).salesReceipt.count({ where: { customerId: id } }).catch(() => 0),
    ]);
    return { contracts, invoices, receipts };
  }

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
    const existing = await this.getContract(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('فقط قرارداد پیش‌نویس قابل ویرایش است');
    }

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.customerId !== undefined) data.customerId = dto.customerId;
      if (dto.totalPrice !== undefined) data.totalPrice = dto.totalPrice;
      if (dto.discountAmount !== undefined) data.discountAmount = dto.discountAmount;
      if (dto.finalPrice !== undefined) data.finalPrice = dto.finalPrice;
      if (dto.downPayment !== undefined) data.downPayment = dto.downPayment;
      if (dto.contractDate) data.contractDate = new Date(dto.contractDate);
      if (dto.deliveryDate !== undefined) data.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
      if (dto.bodyHtml !== undefined) data.bodyHtml = dto.bodyHtml;
      if (dto.notes !== undefined) data.notes = dto.notes;

      // تغییر واحد: آزادسازی قبلی + رزرو جدید
      if (dto.unitId && dto.unitId !== existing.unitId) {
        await tx.salesUnit.update({ where: { id: existing.unitId }, data: { status: 'AVAILABLE' } });
        await tx.salesUnit.update({ where: { id: dto.unitId }, data: { status: 'RESERVED' } });
        data.unitId = dto.unitId;
      }

      // جایگزینی اقساط
      if (dto.installments) {
        await tx.salesInstallment.deleteMany({ where: { contractId: id } });
        if (dto.installments.length) {
          await tx.salesInstallment.createMany({
            data: dto.installments.map((i) => ({
              contractId: id,
              sequence: i.sequence,
              dueDate: new Date(i.dueDate),
              amount: i.amount,
              notes: i.notes,
            })),
          });
        }
      }

      return tx.salesContract.update({ where: { id }, data });
    });
  }

  async removeContract(id: string, options?: { force?: boolean }) {
    const c = await this.getContract(id);
    const force = options?.force === true;

    if (!force) {
      if (c.status !== 'DRAFT' && c.status !== 'CANCELLED') {
        throw new BadRequestException('\u0641\u0642\u0637 \u0642\u0631\u0627\u0631\u062f\u0627\u062f \u067e\u06cc\u0634\u200c\u0646\u0648\u06cc\u0633 \u06cc\u0627 \u0627\u0628\u0637\u0627\u0644\u200c\u0634\u062f\u0647 \u0642\u0627\u0628\u0644 \u062d\u0630\u0641 \u0627\u0633\u062a');
      }
      if (c.payments && c.payments.length > 0) {
        throw new BadRequestException('\u0627\u06cc\u0646 \u0642\u0631\u0627\u0631\u062f\u0627\u062f \u067e\u0631\u062f\u0627\u062e\u062a \u062f\u0627\u0631\u062f \u0648 \u0642\u0627\u0628\u0644 \u062d\u0630\u0641 \u0646\u06cc\u0633\u062a');
      }
      return this.prisma.$transaction(async (tx) => {
        await tx.salesUnit.update({ where: { id: c.unitId }, data: { status: 'AVAILABLE' } });
        await tx.salesInstallment.deleteMany({ where: { contractId: id } });
        await tx.salesContract.delete({ where: { id } });
        return { success: true, hardDeleted: true };
      });
    }

    // force (admin)
    const refs = await this.countContractRefs(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'CONTRACT_HAS_REFS',
        message: '\u0642\u0631\u0627\u0631\u062f\u0627\u062f \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647:\n' + details,
        refs, total,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.salesUnit.update({ where: { id: c.unitId }, data: { status: 'AVAILABLE' } });
      await tx.salesInstallment.deleteMany({ where: { contractId: id } });
      await tx.salesContract.delete({ where: { id } });
    });
    return { success: true, hardDeleted: true };
  }

  private async countContractRefs(id: string) {
    const p = this.prisma;
    const [payments, invoices] = await Promise.all([
      (p as any).salesPayment.count({ where: { contractId: id } }).catch(() => 0),
      (p as any).salesInvoice.count({ where: { contractId: id } }).catch(() => 0),
    ]);
    return { payments, invoices };
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
    const contract = await this.getContract(dto.contractId);

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesPayment.create({
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

      return created;
    });

    try {
      const method = (dto.paymentMethod || 'CASH').toUpperCase();
      const isCash = method === 'CASH';
      const sourceType = isCash ? 'SALE_INSTALLMENT_CASH' : 'SALE_INSTALLMENT_BANK';

      await this.engine.postEvent(sourceType, {
        amount: Number(dto.amount),
        entryDate: new Date(dto.paidAt),
        description: `دریافت ${isCash ? 'نقدی' : 'بانکی'} قسط قرارداد ${contract.code}`,
        reference: contract.code,
        salesCustomerId: contract.customerId,
        sourceId: payment.id,
      });
    } catch (e: any) {
      console.error('[SalesPayment] Auto journal failed:', e?.message || e);
    }

    return payment;
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
