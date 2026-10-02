// E:\EpsayAccounting\scripts\setup-timeline-backend.mjs
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

if (schema.includes('model Permit ')) {
  console.log('  ℹ Schema already extended — skipping');
} else {
  // افزودن relation به Project
  const projectRelationRegex = /(\n\s+capitalAccounts\s+PartnerCapitalAccount\[\])/;
  if (projectRelationRegex.test(schema)) {
    schema = schema.replace(
      projectRelationRegex,
      `$1
  permits             Permit[]
  insurances          Insurance[]
  guarantees          Guarantee[]
  technicalDocuments  TechnicalDocument[]
  phaseChecklists     PhaseChecklist[]`,
    );
    console.log('  ✓ Project relations added');
  } else {
    console.log('  ⚠ Project anchor not found');
  }

  // افزودن مدل‌ها و enumهای جدید
  schema += `

// ============================================================
// TIMELINE, PERMITS & DOCUMENTS (گاه‌شمار، مجوزها و کنترل مستندات)
// ============================================================

enum PermitType {
  DEMOLITION
  CONSTRUCTION
  NO_VIOLATION
  COMPLETION
  OTHER
}

enum PermitStatus {
  PENDING
  ISSUED
  EXPIRED
  CANCELLED
}

model Permit {
  id            String        @id @default(uuid()) @db.Uuid
  code          String        @unique @db.VarChar(32)
  projectId     String        @map("project_id") @db.Uuid
  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)

  type          PermitType
  title         String        @db.VarChar(200)
  number        String?       @db.VarChar(64)
  authority     String?       @db.VarChar(200)
  status        PermitStatus  @default(PENDING)

  issueDate     DateTime?     @map("issue_date") @db.Date
  expiryDate    DateTime?     @map("expiry_date") @db.Date

  attachmentUrl String?       @map("attachment_url") @db.VarChar(500)
  notes         String?       @db.VarChar(500)

  createdById   String?       @map("created_by_id") @db.Uuid
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([status])
  @@index([expiryDate])
  @@map("permits")
}

enum InsuranceType {
  THIRD_PARTY
  ACCIDENT
  FIRE
  EQUIPMENT
  OTHER
}

model Insurance {
  id             String        @id @default(uuid()) @db.Uuid
  code           String        @unique @db.VarChar(32)
  projectId      String?       @map("project_id") @db.Uuid
  project        Project?      @relation(fields: [projectId], references: [id], onDelete: SetNull)

  type           InsuranceType
  title          String        @db.VarChar(200)
  insurer        String?       @db.VarChar(200)
  policyNumber   String?       @map("policy_number") @db.VarChar(64)

  coverageAmount Decimal?      @map("coverage_amount") @db.Decimal(20, 2)
  premiumAmount  Decimal?      @map("premium_amount") @db.Decimal(20, 2)

  startDate      DateTime?     @map("start_date") @db.Date
  expiryDate     DateTime?     @map("expiry_date") @db.Date

  attachmentUrl  String?       @map("attachment_url") @db.VarChar(500)
  notes          String?       @db.VarChar(500)

  createdById    String?       @map("created_by_id") @db.Uuid
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([expiryDate])
  @@map("insurances")
}

enum GuaranteeType {
  BANK_GUARANTEE
  CHECK
  DEPOSIT
  OTHER
}

model Guarantee {
  id             String         @id @default(uuid()) @db.Uuid
  code           String         @unique @db.VarChar(32)
  projectId      String?        @map("project_id") @db.Uuid
  project        Project?       @relation(fields: [projectId], references: [id], onDelete: SetNull)

  type           GuaranteeType
  title          String         @db.VarChar(200)
  issuer         String?        @db.VarChar(200)
  beneficiary    String?        @db.VarChar(200)
  amount         Decimal        @db.Decimal(20, 2)

  issueDate      DateTime?      @map("issue_date") @db.Date
  expiryDate     DateTime?      @map("expiry_date") @db.Date

  attachmentUrl  String?        @map("attachment_url") @db.VarChar(500)
  notes          String?        @db.VarChar(500)

  createdById    String?        @map("created_by_id") @db.Uuid
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([expiryDate])
  @@map("guarantees")
}

enum DocumentType {
  ARCHITECTURE
  STRUCTURE
  MEP
  SITE_PLAN
  OTHER
}

enum DocumentPhase {
  PHASE_1
  PHASE_2
  OTHER
}

model TechnicalDocument {
  id            String         @id @default(uuid()) @db.Uuid
  code          String         @unique @db.VarChar(32)
  projectId     String         @map("project_id") @db.Uuid
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)

  type          DocumentType
  phase         DocumentPhase  @default(PHASE_1)
  title         String         @db.VarChar(200)
  version       String         @db.VarChar(32)
  isApproved    Boolean        @default(false) @map("is_approved")
  approvedAt    DateTime?      @map("approved_at") @db.Date

  attachmentUrl String?        @map("attachment_url") @db.VarChar(500)
  notes         String?        @db.VarChar(500)

  uploadedById  String?        @map("uploaded_by_id") @db.Uuid
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([type])
  @@map("technical_documents")
}

enum ChecklistType {
  REBAR_BEFORE_CONCRETE
  FORMWORK
  ELECTRICAL
  PLUMBING
  WATERPROOFING
  OTHER
}

enum ChecklistStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

model PhaseChecklist {
  id              String           @id @default(uuid()) @db.Uuid
  code            String           @unique @db.VarChar(32)
  projectId       String           @map("project_id") @db.Uuid
  project         Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  wbsItemId       String?          @map("wbs_item_id") @db.Uuid

  type            ChecklistType
  title           String           @db.VarChar(200)
  checklistDate   DateTime         @map("checklist_date") @db.Date
  status          ChecklistStatus  @default(DRAFT)

  items           Json

  inspectorName   String?          @map("inspector_name") @db.VarChar(200)
  supervisorName  String?          @map("supervisor_name") @db.VarChar(200)

  approvedById    String?          @map("approved_by_id") @db.Uuid
  approvedAt      DateTime?        @map("approved_at") @db.Date
  rejectedReason  String?          @map("rejected_reason") @db.VarChar(500)

  notes           String?          @db.VarChar(500)
  createdById     String?          @map("created_by_id") @db.Uuid
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([status])
  @@index([checklistDate])
  @@map("phase_checklists")
}
`;

  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('  ✓ 5 new models + 7 enums added');
}

console.log('\n=== 2. DTOs ===\n');

w('src/modules/timeline/dto/permit.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum PermitTypeDto {
  DEMOLITION = 'DEMOLITION',
  CONSTRUCTION = 'CONSTRUCTION',
  NO_VIOLATION = 'NO_VIOLATION',
  COMPLETION = 'COMPLETION',
  OTHER = 'OTHER',
}

export enum PermitStatusDto {
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export class CreatePermitDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ enum: PermitTypeDto }) @IsEnum(PermitTypeDto) type!: PermitTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authority?: string;
  @ApiPropertyOptional({ enum: PermitStatusDto }) @IsOptional() @IsEnum(PermitStatusDto) status?: PermitStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePermitDto extends CreatePermitDto {}
`);

w('src/modules/timeline/dto/insurance.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum InsuranceTypeDto {
  THIRD_PARTY = 'THIRD_PARTY',
  ACCIDENT = 'ACCIDENT',
  FIRE = 'FIRE',
  EQUIPMENT = 'EQUIPMENT',
  OTHER = 'OTHER',
}

export class CreateInsuranceDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ enum: InsuranceTypeDto }) @IsEnum(InsuranceTypeDto) type!: InsuranceTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insurer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() policyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) premiumAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateInsuranceDto extends CreateInsuranceDto {}
`);

w('src/modules/timeline/dto/guarantee.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum GuaranteeTypeDto {
  BANK_GUARANTEE = 'BANK_GUARANTEE',
  CHECK = 'CHECK',
  DEPOSIT = 'DEPOSIT',
  OTHER = 'OTHER',
}

export class CreateGuaranteeDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ enum: GuaranteeTypeDto }) @IsEnum(GuaranteeTypeDto) type!: GuaranteeTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issuer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() beneficiary?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateGuaranteeDto extends CreateGuaranteeDto {}
`);

w('src/modules/timeline/dto/document.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DocumentTypeDto {
  ARCHITECTURE = 'ARCHITECTURE',
  STRUCTURE = 'STRUCTURE',
  MEP = 'MEP',
  SITE_PLAN = 'SITE_PLAN',
  OTHER = 'OTHER',
}

export enum DocumentPhaseDto {
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ enum: DocumentTypeDto }) @IsEnum(DocumentTypeDto) type!: DocumentTypeDto;
  @ApiProperty({ enum: DocumentPhaseDto }) @IsEnum(DocumentPhaseDto) phase!: DocumentPhaseDto;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() version!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() approvedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateDocumentDto extends CreateDocumentDto {}
`);

w('src/modules/timeline/dto/checklist.dto.ts', `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ChecklistTypeDto {
  REBAR_BEFORE_CONCRETE = 'REBAR_BEFORE_CONCRETE',
  FORMWORK = 'FORMWORK',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  WATERPROOFING = 'WATERPROOFING',
  OTHER = 'OTHER',
}

export class ChecklistItemDto {
  @ApiProperty() title!: string;
  @ApiProperty() isChecked!: boolean;
  @ApiPropertyOptional() notes?: string;
}

export class CreateChecklistDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiProperty({ enum: ChecklistTypeDto }) @IsEnum(ChecklistTypeDto) type!: ChecklistTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsDateString() checklistDate!: string;
  @ApiProperty({ type: [ChecklistItemDto] }) @IsArray() items!: ChecklistItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() inspectorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateChecklistDto extends CreateChecklistDto {}

export class RejectChecklistDto {
  @ApiProperty() @IsString() reason!: string;
}
`);

console.log('\n=== 3. Services ===\n');

// ===== Permits Service =====
w('src/modules/timeline/permits.service.ts', `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePermitDto, UpdatePermitDto } from './dto/permit.dto';

@Injectable()
export class PermitsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.permit.count();
    return 'PRM-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { number: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.permit.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.permit.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!p) throw new NotFoundException('مجوز یافت نشد');
    return p;
  }

  async create(dto: CreatePermitDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.permit.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        number: dto.number,
        authority: dto.authority,
        status: (dto.status as any) || 'PENDING',
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdatePermitDto) {
    await this.findOne(id);
    return this.prisma.permit.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        number: dto.number,
        authority: dto.authority,
        status: dto.status as any,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.permit.delete({ where: { id } });
    return { success: true };
  }

  /**
   * مجوزهایی که تا N روز آینده منقضی می‌شوند
   */
  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.permit.findMany({
      where: {
        status: 'ISSUED',
        expiryDate: { gte: now, lte: future },
      },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
`);

// ===== Insurances Service =====
w('src/modules/timeline/insurances.service.ts', `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto';

@Injectable()
export class InsurancesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.insurance.count();
    return 'INS-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { policyNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.insurance.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const i = await this.prisma.insurance.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!i) throw new NotFoundException('بیمه‌نامه یافت نشد');
    return i;
  }

  async create(dto: CreateInsuranceDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.insurance.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        insurer: dto.insurer,
        policyNumber: dto.policyNumber,
        coverageAmount: dto.coverageAmount,
        premiumAmount: dto.premiumAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateInsuranceDto) {
    await this.findOne(id);
    return this.prisma.insurance.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        insurer: dto.insurer,
        policyNumber: dto.policyNumber,
        coverageAmount: dto.coverageAmount,
        premiumAmount: dto.premiumAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.insurance.delete({ where: { id } });
    return { success: true };
  }

  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.insurance.findMany({
      where: { expiryDate: { gte: now, lte: future } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
`);

// ===== Guarantees Service =====
w('src/modules/timeline/guarantees.service.ts', `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateGuaranteeDto, UpdateGuaranteeDto } from './dto/guarantee.dto';

@Injectable()
export class GuaranteesService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.guarantee.count();
    return 'GRT-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { issuer: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.guarantee.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const g = await this.prisma.guarantee.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!g) throw new NotFoundException('تضمین یافت نشد');
    return g;
  }

  async create(dto: CreateGuaranteeDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.guarantee.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        title: dto.title,
        issuer: dto.issuer,
        beneficiary: dto.beneficiary,
        amount: dto.amount,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateGuaranteeDto) {
    await this.findOne(id);
    return this.prisma.guarantee.update({
      where: { id },
      data: {
        type: dto.type as any,
        title: dto.title,
        issuer: dto.issuer,
        beneficiary: dto.beneficiary,
        amount: dto.amount,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.guarantee.delete({ where: { id } });
    return { success: true };
  }

  async getExpiring(days = 60) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    return this.prisma.guarantee.findMany({
      where: { expiryDate: { gte: now, lte: future } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
`);

// ===== Documents Service =====
w('src/modules/timeline/documents.service.ts', `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.technicalDocument.count();
    return 'DOC-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; phase?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.phase) where.phase = query.phase;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.technicalDocument.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: [{ projectId: 'asc' }, { type: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const d = await this.prisma.technicalDocument.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!d) throw new NotFoundException('سند فنی یافت نشد');
    return d;
  }

  async create(dto: CreateDocumentDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.technicalDocument.create({
      data: {
        code,
        projectId: dto.projectId,
        type: dto.type as any,
        phase: dto.phase as any,
        title: dto.title,
        version: dto.version,
        isApproved: dto.isApproved ?? false,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : null,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
        uploadedById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.technicalDocument.update({
      where: { id },
      data: {
        type: dto.type as any,
        phase: dto.phase as any,
        title: dto.title,
        version: dto.version,
        isApproved: dto.isApproved,
        approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : undefined,
        attachmentUrl: dto.attachmentUrl,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.technicalDocument.delete({ where: { id } });
    return { success: true };
  }
}
`);

// ===== Checklists Service =====
w('src/modules/timeline/checklists.service.ts', `import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateChecklistDto, UpdateChecklistDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.phaseChecklist.count();
    return 'CHK-' + year + '-' + String(count + 1).padStart(4, '0');
  }

  async findAll(query?: { projectId?: string; type?: string; status?: string; search?: string }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.phaseChecklist.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.phaseChecklist.findUnique({
      where: { id },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    if (!c) throw new NotFoundException('چک‌لیست یافت نشد');
    return c;
  }

  async create(dto: CreateChecklistDto, userId?: string) {
    const code = await this.generateCode();
    return this.prisma.phaseChecklist.create({
      data: {
        code,
        projectId: dto.projectId,
        wbsItemId: dto.wbsItemId,
        type: dto.type as any,
        title: dto.title,
        checklistDate: new Date(dto.checklistDate),
        status: 'DRAFT',
        items: dto.items as any,
        inspectorName: dto.inspectorName,
        supervisorName: dto.supervisorName,
        notes: dto.notes,
        createdById: userId,
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateChecklistDto) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT' && c.status !== 'REJECTED') {
      throw new BadRequestException('فقط چک‌لیست‌های پیش‌نویس یا رد‌شده قابل ویرایش هستند');
    }
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: {
        wbsItemId: dto.wbsItemId,
        type: dto.type as any,
        title: dto.title,
        checklistDate: new Date(dto.checklistDate),
        items: dto.items as any,
        inspectorName: dto.inspectorName,
        supervisorName: dto.supervisorName,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    if (c.status === 'APPROVED') {
      throw new BadRequestException('چک‌لیست تاییدشده قابل حذف نیست');
    }
    await this.prisma.phaseChecklist.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const c = await this.findOne(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, reason: string) {
    const c = await this.findOne(id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.phaseChecklist.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    });
  }
}
`);

console.log('\n=== 4. Controllers ===\n');

w('src/modules/timeline/permits.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermitsService } from './permits.service';
import { CreatePermitDto, UpdatePermitDto } from './dto/permit.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Permits - مجوزها و پروانه‌ها')
@ApiBearerAuth()
@Controller('timeline/permits')
export class PermitsController {
  constructor(private s: PermitsService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, status, search }); }

  @Get('expiring')
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'days', required: false })
  getExpiring(@Query('days') days?: string) {
    return this.s.getExpiring(days ? parseInt(days, 10) : 60);
  }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreatePermitDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdatePermitDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/timeline/insurances.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InsurancesService } from './insurances.service';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Insurances - بیمه‌نامه‌ها')
@ApiBearerAuth()
@Controller('timeline/insurances')
export class InsurancesController {
  constructor(private s: InsurancesService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, search }); }

  @Get('expiring')
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'days', required: false })
  getExpiring(@Query('days') days?: string) {
    return this.s.getExpiring(days ? parseInt(days, 10) : 60);
  }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateInsuranceDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/timeline/guarantees.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GuaranteesService } from './guarantees.service';
import { CreateGuaranteeDto, UpdateGuaranteeDto } from './dto/guarantee.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Guarantees - تضامین')
@ApiBearerAuth()
@Controller('timeline/guarantees')
export class GuaranteesController {
  constructor(private s: GuaranteesService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, search }); }

  @Get('expiring')
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'days', required: false })
  getExpiring(@Query('days') days?: string) {
    return this.s.getExpiring(days ? parseInt(days, 10) : 60);
  }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateGuaranteeDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateGuaranteeDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/timeline/documents.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Documents - آرشیو نقشه‌ها')
@ApiBearerAuth()
@Controller('timeline/documents')
export class DocumentsController {
  constructor(private s: DocumentsService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'phase', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('phase') phase?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, phase, search }); }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateDocumentDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }
}
`);

w('src/modules/timeline/checklists.controller.ts', `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, UpdateChecklistDto, RejectChecklistDto } from './dto/checklist.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline Checklists - چک‌لیست‌های پیش‌نیاز')
@ApiBearerAuth()
@Controller('timeline/checklists')
export class ChecklistsController {
  constructor(private s: ChecklistsService) {}

  @Get()
  @RequirePermissions('timeline.read')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) { return this.s.findAll({ projectId, type, status, search }); }

  @Get(':id')
  @RequirePermissions('timeline.read')
  findOne(@Param('id') id: string) { return this.s.findOne(id); }

  @Post()
  @RequirePermissions('timeline.create')
  create(@Body() dto: CreateChecklistDto, @CurrentUser('id') userId: string) {
    return this.s.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermissions('timeline.update')
  update(@Param('id') id: string, @Body() dto: UpdateChecklistDto) {
    return this.s.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timeline.delete')
  remove(@Param('id') id: string) { return this.s.remove(id); }

  @Patch(':id/submit')
  @RequirePermissions('timeline.update')
  submit(@Param('id') id: string) { return this.s.submit(id); }

  @Patch(':id/approve')
  @RequirePermissions('approvals.update')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.s.approve(id, userId);
  }

  @Patch(':id/reject')
  @RequirePermissions('approvals.update')
  reject(@Param('id') id: string, @Body() dto: RejectChecklistDto) {
    return this.s.reject(id, dto.reason);
  }
}
`);

console.log('\n=== 5. Module + app.module ===\n');

w('src/modules/timeline/timeline.module.ts', `import { Module } from '@nestjs/common';
import { PermitsService } from './permits.service';
import { InsurancesService } from './insurances.service';
import { GuaranteesService } from './guarantees.service';
import { DocumentsService } from './documents.service';
import { ChecklistsService } from './checklists.service';

import { PermitsController } from './permits.controller';
import { InsurancesController } from './insurances.controller';
import { GuaranteesController } from './guarantees.controller';
import { DocumentsController } from './documents.controller';
import { ChecklistsController } from './checklists.controller';

@Module({
  controllers: [
    PermitsController,
    InsurancesController,
    GuaranteesController,
    DocumentsController,
    ChecklistsController,
  ],
  providers: [
    PermitsService,
    InsurancesService,
    GuaranteesService,
    DocumentsService,
    ChecklistsService,
  ],
  exports: [
    PermitsService,
    InsurancesService,
    GuaranteesService,
    DocumentsService,
    ChecklistsService,
  ],
})
export class TimelineModule {}
`);

// ثبت در app.module.ts
const appPath = path.join(BACKEND, 'src/app.module.ts');
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('TimelineModule')) {
  // اضافه کردن import
  app = app.replace(
    "import { PartnerCapitalModule } from './modules/partner-capital/partner-capital.module';",
    "import { PartnerCapitalModule } from './modules/partner-capital/partner-capital.module';\nimport { TimelineModule } from './modules/timeline/timeline.module';",
  );
  // اضافه کردن به imports
  app = app.replace(
    '    PartnerCapitalModule,\n  ],',
    '    PartnerCapitalModule,\n    TimelineModule,\n  ],',
  );
  fs.writeFileSync(appPath, app, 'utf8');
  console.log('  ✓ app.module.ts updated');
} else {
  console.log('  ℹ app.module.ts already has TimelineModule');
}

console.log('');
console.log('=============================================');
console.log('  ✅ Timeline Backend ready');
console.log('=============================================');
console.log('');
console.log('Endpoints:');
console.log('  • /api/timeline/permits (CRUD + /expiring)');
console.log('  • /api/timeline/insurances (CRUD + /expiring)');
console.log('  • /api/timeline/guarantees (CRUD + /expiring)');
console.log('  • /api/timeline/documents (CRUD)');
console.log('  • /api/timeline/checklists (CRUD + submit/approve/reject)');
console.log('');
console.log('Next:');
console.log('  1. Stop backend (Ctrl+C)');
console.log('  2. npx prisma migrate dev --name add_timeline_module');
console.log('  3. npx prisma generate');
console.log('  4. npm run start:dev');
console.log('');