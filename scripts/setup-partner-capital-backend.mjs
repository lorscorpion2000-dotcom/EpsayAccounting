import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:/EpsayAccounting/backend';

function w(rel, content) {
  const full = path.join(BACKEND, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

console.log('=== 1. Extend Schema ===\n');

const schemaPath = path.join(BACKEND, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// ===== Partner relations =====
const pMatch = schema.match(/model Partner \{[\s\S]*?\n\}/);
if (pMatch && !pMatch[0].includes('capitalAccounts')) {
  schema = schema.replace(
    pMatch[0],
    pMatch[0].replace(
      /\n\}/,
      '\n  projectPartnerShares  ProjectPartnerShare[]\n  capitalAccounts       PartnerCapitalAccount[]\n  capitalContributions  PartnerCapitalContribution[]\n  capitalWithdrawals    PartnerCapitalWithdrawal[]\n}',
    ),
  );
  console.log('  ✓ Partner relations added');
}

// ===== Project relations =====
const prMatch = schema.match(/model Project \{[\s\S]*?\n\}/);
if (prMatch && !prMatch[0].includes('partnerShares')) {
  schema = schema.replace(
    prMatch[0],
    prMatch[0].replace(
      /\n\}/,
      '\n  partnerShares         ProjectPartnerShare[]\n  capitalAccounts       PartnerCapitalAccount[]\n}',
    ),
  );
  console.log('  ✓ Project relations added');
}

// ===== New models =====
if (!schema.includes('model ProjectPartnerShare')) {
  schema += `

// ============================================================
// PARTNER CAPITAL (شرکا و سرمایه‌گذاران)
// ============================================================

enum CapitalContributionType {
  CASH
  NON_CASH
}

enum CapitalContributionCategory {
  CASH_DEPOSIT
  BANK_TRANSFER
  PETTY_CASH
  LAND
  MATERIALS
  SERVICES
  EQUIPMENT
  VEHICLE
  OTHER
}

enum CapitalTransactionStatus {
  DRAFT
  SUBMITTED
  APPROVED
  PAID
  CANCELLED
}

model ProjectPartnerShare {
  id            String    @id @default(uuid()) @db.Uuid
  projectId     String    @map("project_id") @db.Uuid
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  partnerId     String    @map("partner_id") @db.Uuid
  partner       Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  sharePercent  Decimal   @map("share_percent") @db.Decimal(5, 2)
  effectiveFrom DateTime  @map("effective_from") @db.Date
  effectiveTo   DateTime? @map("effective_to") @db.Date

  notes         String?   @db.VarChar(500)

  createdById   String?   @map("created_by_id") @db.Uuid
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([partnerId])
  @@map("project_partner_shares")
}

model PartnerCapitalAccount {
  id            String    @id @default(uuid()) @db.Uuid
  code          String    @unique @db.VarChar(32)
  partnerId     String    @map("partner_id") @db.Uuid
  partner       Partner   @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  projectId     String?   @map("project_id") @db.Uuid
  project       Project?  @relation(fields: [projectId], references: [id])

  balance       Decimal   @default(0) @db.Decimal(24, 2)

  isActive      Boolean   @default(true) @map("is_active")
  notes         String?   @db.VarChar(500)

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  contributions PartnerCapitalContribution[]
  withdrawals   PartnerCapitalWithdrawal[]

  @@unique([partnerId, projectId])
  @@index([partnerId])
  @@index([projectId])
  @@map("partner_capital_accounts")
}

model PartnerCapitalContribution {
  id                String    @id @default(uuid()) @db.Uuid
  code              String    @unique @db.VarChar(32)
  accountId         String    @map("account_id") @db.Uuid
  account           PartnerCapitalAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  partnerId         String    @map("partner_id") @db.Uuid
  partner           Partner   @relation(fields: [partnerId], references: [id])

  projectId         String?   @map("project_id") @db.Uuid

  type              CapitalContributionType     @default(CASH)
  category          CapitalContributionCategory @default(CASH_DEPOSIT)

  amount            Decimal   @db.Decimal(24, 2)
  currency          String    @default("IRR") @db.VarChar(8)

  contributionDate  DateTime  @map("contribution_date") @db.Date

  description       String?   @db.VarChar(500)
  valuationNotes    String?   @map("valuation_notes") @db.VarChar(500)

  referenceCode     String?   @map("reference_code") @db.VarChar(64)

  status            CapitalTransactionStatus @default(DRAFT)
  approvedById      String?   @map("approved_by_id") @db.Uuid
  approvedAt        DateTime? @map("approved_at")
  rejectedReason    String?   @map("rejected_reason") @db.VarChar(500)

  createdById       String?   @map("created_by_id") @db.Uuid
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  @@index([accountId])
  @@index([partnerId])
  @@index([projectId])
  @@index([status])
  @@map("partner_capital_contributions")
}

model PartnerCapitalWithdrawal {
  id              String    @id @default(uuid()) @db.Uuid
  code            String    @unique @db.VarChar(32)
  accountId       String    @map("account_id") @db.Uuid
  account         PartnerCapitalAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  partnerId       String    @map("partner_id") @db.Uuid
  partner         Partner   @relation(fields: [partnerId], references: [id])

  projectId       String?   @map("project_id") @db.Uuid

  amount          Decimal   @db.Decimal(24, 2)
  withdrawalDate  DateTime  @map("withdrawal_date") @db.Date

  reason          String?   @db.VarChar(500)

  targetProjectId String?   @map("target_project_id") @db.Uuid
  transferToContribution Boolean @default(false) @map("transfer_to_contribution")

  status          CapitalTransactionStatus @default(DRAFT)
  approvedById    String?   @map("approved_by_id") @db.Uuid
  approvedAt      DateTime? @map("approved_at")
  paidAt          DateTime? @map("paid_at")
  rejectedReason  String?   @map("rejected_reason") @db.VarChar(500)

  createdById     String?   @map("created_by_id") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([accountId])
  @@index([partnerId])
  @@index([projectId])
  @@index([status])
  @@map("partner_capital_withdrawals")
}
`;
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('  ✓ 4 new models added');
}

console.log('\n=== 2. DTOs ===\n');

w('src/modules/partner-capital/dto/capital-account.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCapitalAccountDto {
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
`);

w('src/modules/partner-capital/dto/contribution.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum ContributionTypeDto { CASH = 'CASH', NON_CASH = 'NON_CASH' }
export enum ContributionCategoryDto {
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PETTY_CASH = 'PETTY_CASH',
  LAND = 'LAND',
  MATERIALS = 'MATERIALS',
  SERVICES = 'SERVICES',
  EQUIPMENT = 'EQUIPMENT',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export class CreateContributionDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;

  @ApiProperty({ enum: ContributionTypeDto })
  @IsEnum(ContributionTypeDto)
  type!: ContributionTypeDto;

  @ApiProperty({ enum: ContributionCategoryDto })
  @IsEnum(ContributionCategoryDto)
  category!: ContributionCategoryDto;

  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty() @IsDateString() contributionDate!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() valuationNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceCode?: string;
}

export class UpdateContributionDto extends CreateContributionDto {}
`);

w('src/modules/partner-capital/dto/withdrawal.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;

  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty() @IsDateString() withdrawalDate!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() targetProjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() transferToContribution?: boolean;
}

export class UpdateWithdrawalDto extends CreateWithdrawalDto {}
`);

w('src/modules/partner-capital/dto/share.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateShareDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) sharePercent!: number;
  @ApiProperty() @IsDateString() effectiveFrom!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateShareDto extends CreateShareDto {}
`);

w('src/modules/partner-capital/dto/reject.dto.ts', `import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectDto {
  @ApiProperty() @IsString() reason!: string;
}
`);

console.log('\n=== 3. Services ===\n');

// ===== Capital Accounts Service =====
w('src/modules/partner-capital/accounts.service.ts', `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCapitalAccountDto } from './dto/capital-account.dto';

@Injectable()
export class CapitalAccountsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(partnerId: string, projectId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('شریک یافت نشد');

    const count = await this.prisma.partnerCapitalAccount.count();
    const prefix = projectId ? 'PCA' : 'PCC';
    return prefix + '-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; active?: boolean }) {
    const where: any = {};
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.active !== undefined) where.isActive = query.active;

    return this.prisma.partnerCapitalAccount.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true, type: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { contributions: true, withdrawals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const acc = await this.prisma.partnerCapitalAccount.findUnique({
      where: { id },
      include: {
        partner: true,
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { contributions: true, withdrawals: true } },
      },
    });
    if (!acc) throw new NotFoundException('حساب سرمایه یافت نشد');
    return acc;
  }

  async create(dto: CreateCapitalAccountDto) {
    // چک تکراری
    const exists = await this.prisma.partnerCapitalAccount.findFirst({
      where: {
        partnerId: dto.partnerId,
        projectId: dto.projectId || null,
      },
    });
    if (exists) throw new BadRequestException('این حساب قبلاً برای این شریک/پروژه ایجاد شده است');

    const code = await this.generateCode(dto.partnerId, dto.projectId);
    return this.prisma.partnerCapitalAccount.create({
      data: {
        code,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        notes: dto.notes,
      },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const acc = await this.findOne(id);
    if (acc._count.contributions > 0 || acc._count.withdrawals > 0) {
      throw new BadRequestException('این حساب دارای گردش است و قابل حذف نیست');
    }
    await this.prisma.partnerCapitalAccount.delete({ where: { id } });
    return { success: true };
  }

  /**
   * پیدا یا ایجاد حساب برای یک شریک/پروژه
   */
  async findOrCreate(partnerId: string, projectId?: string) {
    let acc = await this.prisma.partnerCapitalAccount.findFirst({
      where: { partnerId, projectId: projectId || null },
    });
    if (!acc) {
      acc = await this.prisma.partnerCapitalAccount.create({
        data: {
          code: await this.generateCode(partnerId, projectId),
          partnerId,
          projectId: projectId || null,
        },
      });
    }
    return acc;
  }
}
`);

// ===== Contributions Service =====
w('src/modules/partner-capital/contributions.service.ts', `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CapitalAccountsService } from './accounts.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    private accounts: CapitalAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.partnerCapitalContribution.count();
    return 'CON-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;

    return this.prisma.partnerCapitalContribution.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.partnerCapitalContribution.findUnique({
      where: { id },
      include: { partner: true, account: true },
    });
    if (!c) throw new NotFoundException('آورده یافت نشد');
    return c;
  }

  async create(dto: CreateContributionDto, userId: string) {
    const code = await this.generateCode();

    return this.prisma.partnerCapitalContribution.create({
      data: {
        code,
        accountId: dto.accountId,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        type: dto.type as any,
        category: dto.category as any,
        amount: dto.amount,
        contributionDate: new Date(dto.contributionDate),
        description: dto.description,
        valuationNotes: dto.valuationNotes,
        referenceCode: dto.referenceCode,
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateContributionDto) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: {
        type: dto.type as any,
        category: dto.category as any,
        amount: dto.amount,
        contributionDate: new Date(dto.contributionDate),
        description: dto.description,
        valuationNotes: dto.valuationNotes,
        referenceCode: dto.referenceCode,
      },
    });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.partnerCapitalContribution.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  /**
   * تایید آورده - موجودی حساب افزایش می‌یابد
   */
  async approve(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    return this.prisma.$transaction(async (tx) => {
      await tx.partnerCapitalAccount.update({
        where: { id: c.accountId },
        data: { balance: { increment: c.amount } },
      });

      return tx.partnerCapitalContribution.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
    });
  }

  async reject(id: string, reason: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.partnerCapitalContribution.update({
      where: { id },
      data: { status: 'CANCELLED', rejectedReason: reason },
    });
  }
}
`);

// ===== Withdrawals Service =====
w('src/modules/partner-capital/withdrawals.service.ts', `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CapitalAccountsService } from './accounts.service';
import { CreateWithdrawalDto, UpdateWithdrawalDto } from './dto/withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private accounts: CapitalAccountsService,
  ) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.partnerCapitalWithdrawal.count();
    return 'WDR-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { partnerId?: string; projectId?: string; status?: string }) {
    const where: any = {};
    if (query?.partnerId) where.partnerId = query.partnerId;
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.status) where.status = query.status;

    return this.prisma.partnerCapitalWithdrawal.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        account: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const w = await this.prisma.partnerCapitalWithdrawal.findUnique({
      where: { id },
      include: { partner: true, account: true },
    });
    if (!w) throw new NotFoundException('برداشت یافت نشد');
    return w;
  }

  async create(dto: CreateWithdrawalDto, userId: string) {
    const code = await this.generateCode();

    return this.prisma.partnerCapitalWithdrawal.create({
      data: {
        code,
        accountId: dto.accountId,
        partnerId: dto.partnerId,
        projectId: dto.projectId,
        amount: dto.amount,
        withdrawalDate: new Date(dto.withdrawalDate),
        reason: dto.reason,
        targetProjectId: dto.targetProjectId,
        transferToContribution: dto.transferToContribution ?? false,
        status: 'DRAFT',
        createdById: userId,
      },
      include: { partner: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateWithdrawalDto) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ویرایش است');

    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: {
        amount: dto.amount,
        withdrawalDate: new Date(dto.withdrawalDate),
        reason: dto.reason,
        targetProjectId: dto.targetProjectId,
        transferToContribution: dto.transferToContribution,
      },
    });
  }

  async remove(id: string) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.partnerCapitalWithdrawal.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const w = await this.findOne(id);
    if (w.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const w = await this.findOne(id);
    if (w.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');

    return this.prisma.$transaction(async (tx) => {
      // برداشت از موجودی حساب
      await tx.partnerCapitalAccount.update({
        where: { id: w.accountId },
        data: { balance: { decrement: w.amount } },
      });

      // اگر انتقال به پروژه دیگر باشد
      if (w.transferToContribution && w.targetProjectId) {
        const targetAcc = await this.accounts.findOrCreate(w.partnerId, w.targetProjectId);
        const year = new Date().getFullYear();
        const count = await tx.partnerCapitalContribution.count();

        await tx.partnerCapitalContribution.create({
          data: {
            code: 'CON-' + year + '-' + String(count + 1).padStart(4, '0'),
            accountId: targetAcc.id,
            partnerId: w.partnerId,
            projectId: w.targetProjectId,
            type: 'CASH',
            category: 'CASH_DEPOSIT',
            amount: w.amount,
            contributionDate: new Date(),
            description: 'انتقال از پروژه دیگر (برداشت ' + w.code + ')',
            referenceCode: w.code,
            status: 'APPROVED',
            approvedById: userId,
            approvedAt: new Date(),
          },
        });

        await tx.partnerCapitalAccount.update({
          where: { id: targetAcc.id },
          data: { balance: { increment: w.amount } },
        });
      }

      return tx.partnerCapitalWithdrawal.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
    });
  }

  async reject(id: string, reason: string) {
    const w = await this.findOne(id);
    if (w.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.partnerCapitalWithdrawal.update({
      where: { id },
      data: { status: 'CANCELLED', rejectedReason: reason },
    });
  }
}
`);

// ===== Shares Service =====
w('src/modules/partner-capital/shares.service.ts', `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateShareDto, UpdateShareDto } from './dto/share.dto';

@Injectable()
export class SharesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { projectId?: string; partnerId?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.partnerId) where.partnerId = query.partnerId;

    return this.prisma.projectPartnerShare.findMany({
      where,
      include: {
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ projectId: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.projectPartnerShare.findUnique({
      where: { id },
      include: { partner: true, project: true },
    });
    if (!s) throw new NotFoundException('سهم یافت نشد');
    return s;
  }

  /**
   * بررسی جمع درصدهای سهم در یک پروژه در تاریخ مشخص
   */
  private async validateTotalShares(projectId: string, effectiveFrom: Date, excludeId?: string) {
    const shares = await this.prisma.projectPartnerShare.findMany({
      where: {
        projectId,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
        effectiveFrom: { lte: effectiveFrom },
      },
    });
    const total = shares.reduce((s, sh) => s + Number(sh.sharePercent), 0);
    return total;
  }

  async create(dto: CreateShareDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const currentTotal = await this.validateTotalShares(dto.projectId, effectiveFrom);

    if (currentTotal + Number(dto.sharePercent) > 100) {
      throw new BadRequestException(
        \`جمع سهم‌ها از ۱۰۰٪ بیشتر می‌شود. جمع فعلی: \${currentTotal.toFixed(2)}٪ + \${dto.sharePercent}٪\`,
      );
    }

    return this.prisma.projectPartnerShare.create({
      data: {
        projectId: dto.projectId,
        partnerId: dto.partnerId,
        sharePercent: dto.sharePercent,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        notes: dto.notes,
      },
      include: {
        partner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateShareDto) {
    await this.findOne(id);
    return this.prisma.projectPartnerShare.update({
      where: { id },
      data: {
        sharePercent: dto.sharePercent,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.projectPartnerShare.delete({ where: { id } });
    return { success: true };
  }
}
`);

// ===== Reports Service =====
w('src/modules/partner-capital/reports.service.ts', `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class CapitalReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * تراز تسویه جاری همه شرکا
   */
  async balanceSheet() {
    const accounts = await this.prisma.partnerCapitalAccount.findMany({
      where: { isActive: true },
      include: {
        partner: { select: { id: true, code: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    });

    const totalContributions = await this.prisma.partnerCapitalContribution.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });
    const totalWithdrawals = await this.prisma.partnerCapitalWithdrawal.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    return {
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        partnerName: a.partner.name,
        partnerCode: a.partner.code,
        projectName: a.project?.name || 'شرکت (عمومی)',
        projectCode: a.project?.code || '—',
        balance: Number(a.balance),
      })),
      totals: {
        contributions: Number(totalContributions._sum.amount || 0),
        withdrawals: Number(totalWithdrawals._sum.amount || 0),
        net: Number(totalContributions._sum.amount || 0) - Number(totalWithdrawals._sum.amount || 0),
      },
    };
  }

  /**
   * صورت‌حساب تفصیلی یک شریک
   */
  async partnerStatement(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('شریک یافت نشد');

    const [contributions, withdrawals, accounts, shares] = await Promise.all([
      this.prisma.partnerCapitalContribution.findMany({
        where: { partnerId, status: 'APPROVED' },
        orderBy: { contributionDate: 'asc' },
      }),
      this.prisma.partnerCapitalWithdrawal.findMany({
        where: { partnerId, status: 'APPROVED' },
        orderBy: { withdrawalDate: 'asc' },
      }),
      this.prisma.partnerCapitalAccount.findMany({
        where: { partnerId },
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.projectPartnerShare.findMany({
        where: { partnerId },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

    const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0);
    const totalWithdraw = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

    return {
      partner,
      summary: {
        totalContributions: totalContrib,
        totalWithdrawals: totalWithdraw,
        netBalance: totalContrib - totalWithdraw,
      },
      contributions,
      withdrawals,
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        projectName: a.project?.name || 'شرکت (عمومی)',
        balance: Number(a.balance),
      })),
      shares: shares.map((s) => ({
        projectName: s.project.name,
        sharePercent: Number(s.sharePercent),
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
      })),
    };
  }
}
`);

console.log('\n=== 4. Controllers ===\n');

w('src/modules/partner-capital/accounts.controller.ts', `import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CapitalAccountsService } from './accounts.service';
import { CreateCapitalAccountDto } from './dto/capital-account.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Partner Capital Accounts - حساب‌های سرمایه شرکا')
@ApiBearerAuth()
@Controller('partner-capital/accounts')
export class CapitalAccountsController {
  constructor(private s: CapitalAccountsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
  ) { return this.s.findAll({ partnerId, projectId }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateCapitalAccountDto) { return this.s.create(dto); }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/partner-capital/contributions.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Capital Contributions - آورده شرکا')
@ApiBearerAuth()
@Controller('partner-capital/contributions')
export class ContributionsController {
  constructor(private s: ContributionsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) { return this.s.findAll({ partnerId, projectId, status }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateContributionDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateContributionDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('partners.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }
}
`);

w('src/modules/partner-capital/withdrawals.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, UpdateWithdrawalDto } from './dto/withdrawal.dto';
import { RejectDto } from './dto/reject.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Capital Withdrawals - برداشت شرکا')
@ApiBearerAuth()
@Controller('partner-capital/withdrawals')
export class WithdrawalsController {
  constructor(private s: WithdrawalsService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) { return this.s.findAll({ partnerId, projectId, status }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateWithdrawalDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateWithdrawalDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('partners.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.s.reject(id, dto.reason);
  }
}
`);

w('src/modules/partner-capital/shares.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto } from './dto/share.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Project Partner Shares - سهم‌الشرکه پروژه‌ها')
@ApiBearerAuth()
@Controller('partner-capital/shares')
export class SharesController {
  constructor(private s: SharesService) {}

  @Get()
  @RequirePermissions('partners.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'partnerId', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('partnerId') partnerId?: string,
  ) { return this.s.findAll({ projectId, partnerId }); }

  @Get(':id')
  @RequirePermissions('partners.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('partners.create')
  create(@Body() dto: CreateShareDto) { return this.s.create(dto); }

  @Patch(':id')
  @RequirePermissions('partners.update')
  update(@Param('id') id: string, @Body() dto: UpdateShareDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partners.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/partner-capital/reports.controller.ts', `import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CapitalReportsService } from './reports.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Capital Reports - گزارش‌های سرمایه')
@ApiBearerAuth()
@Controller('partner-capital/reports')
export class CapitalReportsController {
  constructor(private s: CapitalReportsService) {}

  @Get('balance-sheet')
  @RequirePermissions('partners.read')
  balanceSheet() { return this.s.balanceSheet(); }

  @Get('partner-statement/:partnerId')
  @RequirePermissions('partners.read')
  partnerStatement(@Param('partnerId') partnerId: string) {
    return this.s.partnerStatement(partnerId);
  }
}
`);

console.log('\n=== 5. Module + app.module ===\n');

w('src/modules/partner-capital/partner-capital.module.ts', `import { Module } from '@nestjs/common';
import { CapitalAccountsService } from './accounts.service';
import { ContributionsService } from './contributions.service';
import { WithdrawalsService } from './withdrawals.service';
import { SharesService } from './shares.service';
import { CapitalReportsService } from './reports.service';

import { CapitalAccountsController } from './accounts.controller';
import { ContributionsController } from './contributions.controller';
import { WithdrawalsController } from './withdrawals.controller';
import { SharesController } from './shares.controller';
import { CapitalReportsController } from './reports.controller';

@Module({
  controllers: [
    CapitalAccountsController,
    ContributionsController,
    WithdrawalsController,
    SharesController,
    CapitalReportsController,
  ],
  providers: [
    CapitalAccountsService,
    ContributionsService,
    WithdrawalsService,
    SharesService,
    CapitalReportsService,
  ],
  exports: [
    CapitalAccountsService,
    ContributionsService,
    WithdrawalsService,
    SharesService,
    CapitalReportsService,
  ],
})
export class PartnerCapitalModule {}
`);

const appPath = path.join(BACKEND, 'src/app.module.ts');
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('PartnerCapitalModule')) {
  app = app.replace(
    "import { DashboardModule } from './modules/dashboard/dashboard.module';",
    "import { DashboardModule } from './modules/dashboard/dashboard.module';\nimport { PartnerCapitalModule } from './modules/partner-capital/partner-capital.module';",
  );
  app = app.replace(
    '    DashboardModule,\n  ],',
    '    DashboardModule,\n    PartnerCapitalModule,\n  ],',
  );
  fs.writeFileSync(appPath, app, 'utf8');
  console.log('  ✓ app.module.ts updated');
}

console.log('');
console.log('=============================================');
console.log('  ✅ Partner Capital Backend ready');
console.log('=============================================');
console.log('');
console.log('Endpoints:');
console.log('  • /api/partner-capital/accounts (CRUD)');
console.log('  • /api/partner-capital/contributions (CRUD + submit/approve/reject)');
console.log('  • /api/partner-capital/withdrawals (CRUD + submit/approve/reject)');
console.log('  • /api/partner-capital/shares (CRUD)');
console.log('  • /api/partner-capital/reports/balance-sheet');
console.log('  • /api/partner-capital/reports/partner-statement/:partnerId');
console.log('');
console.log('Next:');
console.log('  1. Stop backend (Ctrl+C)');
console.log('  2. npx prisma migrate dev --name add_partner_capital');
console.log('  3. npx prisma generate');
console.log('  4. npm run start:dev');
console.log('');