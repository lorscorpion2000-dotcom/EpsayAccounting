// E:\EpsayAccounting\scripts\setup-backend-contracts-sales.mjs
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:/EpsayAccounting/backend';
const SRC     = path.join(BACKEND, 'src/modules');

function w(rel, content) {
  const full = path.join(SRC, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Contracts Module ===\n');

w('contracts/contracts.module.ts', `import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
`);

w('contracts/dto/create-party.dto.ts', `import {
  IsString, IsOptional, IsEnum, IsInt, IsDateString, Min,
} from 'class-validator';

export enum LegalContractPartyKindDto {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export class CreateLegalPartyDto {
  @IsEnum(LegalContractPartyKindDto)
  kind!: LegalContractPartyKindDto;

  @IsString() fullName!: string;

  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() economicCode?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() mobilePhone?: string;
  @IsOptional() @IsString() landlinePhone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsInt() @Min(0) childrenCount?: number;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() job?: string;
  @IsOptional() @IsString() insuranceNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankSheba?: string;
  @IsOptional() @IsString() notes?: string;
}
`);

w('contracts/dto/create-contract.dto.ts', `import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt, IsDateString, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LegalContractKindDto {
  WORKER_EMPLOYMENT = 'WORKER_EMPLOYMENT',
  CONTRACTOR_AGREEMENT = 'CONTRACTOR_AGREEMENT',
  CLIENT_CONTRACT = 'CLIENT_CONTRACT',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
}

export class CreateLegalContractDto {
  @IsEnum(LegalContractKindDto) kind!: LegalContractKindDto;

  @IsString() title!: string;
  @IsString() partyId!: string;

  @IsOptional() @IsString() projectId?: string;

  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsDateString() registrationDate?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() bodyHtml?: string;

  @IsOptional() @IsNumber() @Type(() => Number) totalAmount?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryMonthly?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryDaily?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salaryHourly?: number;
  @IsOptional() @IsInt() @Type(() => Number) workHoursPerWeek?: number;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() durationText?: string;
  @IsOptional() @IsString() workLocation?: string;

  @IsOptional() @IsString() guaranteeType?: string;
  @IsOptional() @IsString() guaranteeNumber?: string;
  @IsOptional() @IsNumber() @Type(() => Number) guaranteeAmount?: number;
  @IsOptional() @IsString() guaranteeBank?: string;

  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional() @IsString() companySignerName?: string;
  @IsOptional() @IsString() workerSignerName?: string;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateLegalContractDto extends CreateLegalContractDto {}

export class CancelLegalContractDto {
  @IsString() reason!: string;
}
`);

w('contracts/contracts.service.ts', `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Auto code: LC-YYYY-####
  // ─────────────────────────────────────────────
  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'LC-' + year + '-';
    const last = await this.prisma.legalContract.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(4, '0');
  }

  async list(params: { kind?: string; status?: string; search?: string; projectId?: string }) {
    const where: any = {};
    if (params.kind) where.kind = params.kind;
    if (params.status) where.status = params.status;
    if (params.projectId) where.projectId = params.projectId;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { registrationNumber: { contains: params.search, mode: 'insensitive' } },
        { party: { fullName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.legalContract.findMany({
      where,
      include: {
        party: { select: { id: true, fullName: true, nationalId: true, kind: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const item = await this.prisma.legalContract.findUnique({
      where: { id },
      include: {
        party: true,
        project: { select: { id: true, name: true, code: true } },
        attachments: true,
      },
    });
    if (!item) throw new NotFoundException('قرارداد پیدا نشد');
    return item;
  }

  async create(dto: CreateLegalContractDto) {
    const code = await this.nextCode();
    return this.prisma.legalContract.create({
      data: {
        code,
        kind: dto.kind as any,
        status: 'DRAFT',
        title: dto.title,
        partyId: dto.partyId,
        projectId: dto.projectId,
        registrationNumber: dto.registrationNumber,
        registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : undefined,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        totalAmount: dto.totalAmount,
        salaryMonthly: dto.salaryMonthly,
        salaryDaily: dto.salaryDaily,
        salaryHourly: dto.salaryHourly,
        workHoursPerWeek: dto.workHoursPerWeek,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        durationText: dto.durationText,
        workLocation: dto.workLocation,
        guaranteeType: dto.guaranteeType,
        guaranteeNumber: dto.guaranteeNumber,
        guaranteeAmount: dto.guaranteeAmount,
        guaranteeBank: dto.guaranteeBank,
        supervisorName: dto.supervisorName,
        companySignerName: dto.companySignerName,
        workerSignerName: dto.workerSignerName,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateLegalContractDto) {
    await this.get(id);
    const data: any = { ...dto };
    if (dto.registrationDate) data.registrationDate = new Date(dto.registrationDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.legalContract.update({ where: { id }, data });
  }

  async cancel(id: string, reason: string, userId?: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('دلیل ابطال الزامی است');
    }
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledById: userId,
      },
    });
  }

  async activate(id: string) {
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async complete(id: string) {
    await this.get(id);
    return this.prisma.legalContract.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  // ─────────────────────────────────────────────
  // Parties
  // ─────────────────────────────────────────────
  async listParties(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.legalContractParty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getParty(id: string) {
    const p = await this.prisma.legalContractParty.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('طرف قرارداد پیدا نشد');
    return p;
  }

  async createParty(dto: CreateLegalPartyDto) {
    return this.prisma.legalContractParty.create({
      data: {
        kind: dto.kind as any,
        fullName: dto.fullName,
        fatherName: dto.fatherName,
        nationalId: dto.nationalId || null,
        economicCode: dto.economicCode,
        registrationNumber: dto.registrationNumber,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        mobilePhone: dto.mobilePhone,
        landlinePhone: dto.landlinePhone,
        email: dto.email,
        maritalStatus: dto.maritalStatus as any,
        childrenCount: dto.childrenCount,
        education: dto.education,
        job: dto.job,
        insuranceNumber: dto.insuranceNumber,
        address: dto.address,
        postalCode: dto.postalCode,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankSheba: dto.bankSheba,
        notes: dto.notes,
      },
    });
  }

  async updateParty(id: string, dto: CreateLegalPartyDto) {
    await this.getParty(id);
    const data: any = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    return this.prisma.legalContractParty.update({ where: { id }, data });
  }
}
`);

w('contracts/contracts.controller.ts', `import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import {
  CreateLegalContractDto,
  UpdateLegalContractDto,
  CancelLegalContractDto,
} from './dto/create-contract.dto';
import { CreateLegalPartyDto } from './dto/create-party.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private svc: ContractsService) {}

  // ── Contracts ──
  @Get()
  list(
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.svc.list({ kind, status, search, projectId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() dto: CreateLegalContractDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLegalContractDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelLegalContractDto, @Req() req: any) {
    return this.svc.cancel(id, dto.reason, req.user?.id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.svc.activate(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.svc.complete(id);
  }

  // ── Parties ──
  @Get('parties/list')
  listParties(@Query('search') search?: string) {
    return this.svc.listParties(search);
  }

  @Get('parties/:id')
  getParty(@Param('id') id: string) {
    return this.svc.getParty(id);
  }

  @Post('parties')
  createParty(@Body() dto: CreateLegalPartyDto) {
    return this.svc.createParty(dto);
  }

  @Patch('parties/:id')
  updateParty(@Param('id') id: string, @Body() dto: CreateLegalPartyDto) {
    return this.svc.updateParty(id, dto);
  }
}
`);

console.log('\n=== 2. Sales Module ===\n');

w('sales/sales.module.ts', `import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import {
  SalesUnitsController,
  SalesCustomersController,
  SalesContractsController,
  SalesPaymentsController,
} from './sales.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    SalesUnitsController,
    SalesCustomersController,
    SalesContractsController,
    SalesPaymentsController,
  ],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
`);

w('sales/dto/create-unit.dto.ts', `import { IsString, IsOptional, IsInt, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SalesUnitStatusDto {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class CreateSalesUnitDto {
  @IsString() projectId!: string;
  @IsString() unitNumber!: string;

  @IsOptional() @IsString() block?: string;
  @IsOptional() @IsInt() @Type(() => Number) floor?: number;
  @IsOptional() @IsNumber() @Type(() => Number) area?: number;
  @IsOptional() @IsInt() @Type(() => Number) bedrooms?: number;
  @IsOptional() @IsInt() @Type(() => Number) parkingCount?: number;
  @IsOptional() @IsInt() @Type(() => Number) storageCount?: number;
  @IsOptional() @IsNumber() @Type(() => Number) listPrice?: number;
  @IsOptional() @IsEnum(SalesUnitStatusDto) status?: SalesUnitStatusDto;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSalesUnitDto extends CreateSalesUnitDto {}
`);

w('sales/dto/create-customer.dto.ts', `import { IsString, IsOptional } from 'class-validator';

export class CreateSalesCustomerDto {
  @IsString() fullName!: string;

  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() mobilePhone?: string;
  @IsOptional() @IsString() landlinePhone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() bankSheba?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSalesCustomerDto extends CreateSalesCustomerDto {}
`);

w('sales/dto/create-sales-contract.dto.ts', `import {
  IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentInputDto {
  @IsNumber() @Type(() => Number) sequence!: number;
  @IsDateString() dueDate!: string;
  @IsNumber() @Type(() => Number) amount!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateSalesContractDto {
  @IsString() unitId!: string;
  @IsString() customerId!: string;

  @IsNumber() @Type(() => Number) totalPrice!: number;
  @IsOptional() @IsNumber() @Type(() => Number) discountAmount?: number;
  @IsNumber() @Type(() => Number) finalPrice!: number;
  @IsOptional() @IsNumber() @Type(() => Number) downPayment?: number;

  @IsDateString() contractDate!: string;
  @IsOptional() @IsDateString() deliveryDate?: string;

  @IsOptional() @IsString() bodyHtml?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentInputDto)
  installments?: InstallmentInputDto[];
}

export class UpdateSalesContractDto extends CreateSalesContractDto {}

export class CancelSalesContractDto {
  @IsString() reason!: string;
}
`);

w('sales/dto/create-payment.dto.ts', `import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesPaymentDto {
  @IsString() contractId!: string;
  @IsNumber() @Type(() => Number) amount!: number;
  @IsDateString() paidAt!: string;

  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() notes?: string;
}
`);

w('sales/sales.service.ts', `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
`);

w('sales/sales.controller.ts', `import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesUnitDto, UpdateSalesUnitDto } from './dto/create-unit.dto';
import {
  CreateSalesCustomerDto,
  UpdateSalesCustomerDto,
} from './dto/create-customer.dto';
import {
  CreateSalesContractDto,
  UpdateSalesContractDto,
  CancelSalesContractDto,
} from './dto/create-sales-contract.dto';
import { CreateSalesPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// ═══════════════════════════════════════════════
// Units
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/units')
export class SalesUnitsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.listUnits({ projectId, status, search });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getUnit(id);
  }

  @Post()
  create(@Body() dto: CreateSalesUnitDto) {
    return this.svc.createUnit(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesUnitDto) {
    return this.svc.updateUnit(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancelUnit(id);
  }
}

// ═══════════════════════════════════════════════
// Customers
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/customers')
export class SalesCustomersController {
  constructor(private svc: SalesService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.svc.listCustomers(search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getCustomer(id);
  }

  @Post()
  create(@Body() dto: CreateSalesCustomerDto) {
    return this.svc.createCustomer(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesCustomerDto) {
    return this.svc.updateCustomer(id, dto);
  }
}

// ═══════════════════════════════════════════════
// Contracts
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/contracts')
export class SalesContractsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('unitId') unitId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.svc.listContracts({ status, search, unitId, customerId });
  }

  @Get('summary')
  summary() {
    return this.svc.summary();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getContract(id);
  }

  @Post()
  create(@Body() dto: CreateSalesContractDto) {
    return this.svc.createContract(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesContractDto) {
    return this.svc.updateContract(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.svc.activateContract(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSalesContractDto) {
    return this.svc.cancelContract(id, dto.reason);
  }
}

// ═══════════════════════════════════════════════
// Payments
// ═══════════════════════════════════════════════
@UseGuards(JwtAuthGuard)
@Controller('sales/payments')
export class SalesPaymentsController {
  constructor(private svc: SalesService) {}

  @Get()
  list(@Query('contractId') contractId?: string) {
    return this.svc.listPayments(contractId);
  }

  @Post()
  create(@Body() dto: CreateSalesPaymentDto) {
    return this.svc.createPayment(dto);
  }
}
`);

console.log('\n=== 3. Patch app.module.ts ===\n');

const appModulePath = path.join(BACKEND, 'src/app.module.ts');
let app = fs.readFileSync(appModulePath, 'utf8');

if (!app.includes('ContractsModule')) {
  app = app.replace(
    /(import \{ TimelineModule \} from '\.\/modules\/timeline\/timeline\.module';)/,
    `$1\nimport { ContractsModule } from './modules/contracts/contracts.module';\nimport { SalesModule } from './modules/sales/sales.module';`
  );
  app = app.replace(
    /(TimelineModule,)/,
    `$1\n    ContractsModule,\n    SalesModule,`
  );
  fs.writeFileSync(appModulePath, app, 'utf8');
  console.log('  ✓ ContractsModule و SalesModule به app.module.ts اضافه شد');
} else {
  console.log('  ℹ از قبل موجود بود');
}

console.log('\n════════════════════════════════════════════════');
console.log('  ✅ Backend Contracts + Sales Complete!');
console.log('════════════════════════════════════════════════');
console.log('');
console.log('Modules created:');
console.log('  • contracts  (contracts + parties + abort)');
console.log('  • sales      (units + customers + contracts + payments)');
console.log('');
console.log('Next:');
console.log('  cd E:\\EpsayAccounting\\backend');
console.log('  npm run build');
console.log('');