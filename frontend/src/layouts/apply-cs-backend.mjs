// apply-cs-backend.mjs — Wave 3.2.2
import { writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BE = 'E:/EpsayAccounting/backend';
const NL = String.fromCharCode(10);

function ensureDir(p) { try { mkdirSync(p, { recursive: true }); } catch {} }
function write(path, content) {
  ensureDir(dirname(path));
  if (existsSync(path)) copyFileSync(path, path + '.bak-' + Date.now());
  writeFileSync(path, content, 'utf8');
  console.log('[OK] wrote ' + path.replace(BE, ''));
}
function patch(path, transform, label) {
  if (!existsSync(path)) { console.log('[SKIP] ' + label); return; }
  let c = readFileSync(path, 'utf8');
  if (c.charCodeAt(0) === 0xFEFF) c = c.slice(1);
  const before = c;
  c = transform(c);
  if (c === before) { console.log('[OK] ' + label + ' already patched'); return; }
  copyFileSync(path, path + '.bak-' + Date.now());
  writeFileSync(path, c, 'utf8');
  console.log('[OK] patched ' + label);
}

// ═══════════════════════════════════════════════════════════
// 1. DTO
// ═══════════════════════════════════════════════════════════
write(BE + '/src/modules/client-statement/dto/client-statement.dto.ts', `import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CSStatusEnum {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum CSCategoryEnum {
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR',
  MISC = 'MISC',
  TRANSPORT = 'TRANSPORT',
  EQUIPMENT = 'EQUIPMENT',
}

export class CSItemDto {
  @ApiProperty({ enum: CSCategoryEnum })
  @IsEnum(CSCategoryEnum)
  category: CSCategoryEnum;

  @ApiPropertyOptional({ example: '321' })
  @IsOptional() @IsString() @MaxLength(64)
  priceListCode?: string;

  @ApiProperty({ example: 'خرید بتن' })
  @IsString() @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'مترمکعب' })
  @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiProperty({ example: 7683539850 })
  @IsNumber() @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional() @IsString()
  itemDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class CreateCSDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contractId?: string;

  @ApiPropertyOptional({ example: 1 }) @IsOptional() @IsInt() @Min(1)
  statementNumber?: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  periodStart: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsString()
  periodEnd: string;

  @ApiPropertyOptional({ example: 1.07, default: 1.07 })
  @IsOptional() @IsNumber() @Min(0)
  coefficient?: number;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional() @IsNumber() @Min(0)
  contractorSharePercent?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @IsNumber() @Min(0)
  prepaymentDeductionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [CSItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CSItemDto)
  items?: CSItemDto[];
}

export class UpdateCSDto extends PartialType(CreateCSDto) {}

export class ImportCSItemsDto {
  @ApiProperty({ enum: CSCategoryEnum })
  @IsEnum(CSCategoryEnum)
  category: CSCategoryEnum;

  @ApiProperty({ type: [CSItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CSItemDto)
  items: CSItemDto[];
}

export class SubmitDto {} // no body

export class RejectCSDto {
  @ApiProperty() @IsString() @MaxLength(500)
  reason: string;
}
`);

// ═══════════════════════════════════════════════════════════
// 2. Service
// ═══════════════════════════════════════════════════════════
write(BE + '/src/modules/client-statement/client-statement.service.ts', `import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateCSDto, UpdateCSDto, CSItemDto, ImportCSItemsDto,
} from './dto/client-statement.dto';

const CATEGORIES = ['MATERIAL', 'LABOR', 'MISC', 'TRANSPORT', 'EQUIPMENT'] as const;
type Category = typeof CATEGORIES[number];

@Injectable()
export class ClientStatementService {
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
    });
    return (last?.statementNumber || 0) + 1;
  }

  private computeTotals(
    items: { category: string; unitPrice: any; quantity: any; totalPrice: any }[],
    coefficient: number,
    prepaymentAmount: number,
    prepaymentDeductionPercent: number,
  ) {
    const subtotals: Record<Category, number> = {
      MATERIAL: 0, LABOR: 0, MISC: 0, TRANSPORT: 0, EQUIPMENT: 0,
    };

    for (const it of items) {
      const cat = it.category as Category;
      if (cat in subtotals) {
        subtotals[cat] += Number(it.totalPrice);
      }
    }

    const totalBeforeCoefficient =
      subtotals.MATERIAL + subtotals.LABOR + subtotals.MISC +
      subtotals.TRANSPORT + subtotals.EQUIPMENT;

    const totalAfterCoefficient = totalBeforeCoefficient * coefficient;
    const contractorShareAmount = totalAfterCoefficient - totalBeforeCoefficient;
    const prepaymentDeductionAmount =
      (prepaymentAmount * prepaymentDeductionPercent) / 100;
    const netPayable = contractorShareAmount - prepaymentDeductionAmount;

    return {
      subtotals,
      totalBeforeCoefficient,
      totalAfterCoefficient,
      contractorShareAmount,
      prepaymentDeductionAmount,
      netPayable,
    };
  }

  private async resolveContractData(projectId: string, contractId?: string) {
    if (contractId) {
      const c = await this.prisma.contract.findUnique({ where: { id: contractId } });
      if (c) return { coefficient: Number(c.coefficient), prepaymentAmount: Number(c.prepaymentAmount || 0) };
    }
    const c = await this.prisma.contract.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (c) return { coefficient: Number(c.coefficient), prepaymentAmount: Number(c.prepaymentAmount || 0) };
    return { coefficient: 1.07, prepaymentAmount: 0 };
  }

  async list(query?: { projectId?: string; status?: string; search?: string }) {
    const where: any = {};
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
        project: { select: { id: true, code: true, name: true, clientId: true } },
        journalEntry: { select: { id: true, code: true, status: true } },
        items: {
          include: { wbsItem: { select: { id: true, code: true, title: true } } },
          orderBy: [{ category: 'asc' }, { rowNumber: 'asc' }],
        },
      },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');
    return s;
  }

  async create(dto: CreateCSDto) {
    let statementNumber = dto.statementNumber;
    if (!statementNumber) {
      statementNumber = await this.nextStatementNumber(dto.projectId);
    } else {
      const exists = await this.prisma.clientStatement.findFirst({
        where: { projectId: dto.projectId, statementNumber },
      });
      if (exists) throw new BadRequestException('این شماره صورت‌وضعیت قبلاً برای این پروژه ثبت شده است');
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

    const totals = this.computeTotals(
      items,
      coefficient,
      contractData.prepaymentAmount,
      prepaymentDeductionPercent,
    );

    const code = await this.nextCode();

    return this.prisma.clientStatement.create({
      data: {
        code,
        projectId: dto.projectId,
        contractId: dto.contractId,
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

  private async recompute(id: string) {
    const s = await this.prisma.clientStatement.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!s) throw new NotFoundException('صورت‌وضعیت یافت نشد');

    const contractData = await this.resolveContractData(s.projectId, s.contractId || undefined);
    const totals = this.computeTotals(
      s.items,
      Number(s.coefficient),
      contractData.prepaymentAmount,
      Number(s.prepaymentDeductionPercent),
    );

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

  async importItems(id: string, dto: ImportCSItemsDto) {
    const s = await this.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');

    const startRow = s.items.length;
    const items = dto.items.map((it, idx) => ({
      statementId: id,
      category: dto.category as any,
      rowNumber: startRow + idx + 1,
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

    const result = await this.prisma.clientStatementItem.createMany({ data: items });
    await this.recompute(id);
    return { inserted: result.count };
  }

  async deleteItem(itemId: string) {
    const it = await this.prisma.clientStatementItem.findUnique({ where: { id: itemId } });
    if (!it) throw new NotFoundException('ردیف یافت نشد');
    const s = await this.prisma.clientStatement.findUnique({ where: { id: it.statementId } });
    if (!s || s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل تغییر است');
    await this.prisma.clientStatementItem.delete({ where: { id: itemId } });
    await this.recompute(it.statementId);
    return { success: true };
  }

  async remove(id: string) {
    const s = await this.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل حذف است');
    await this.prisma.clientStatement.delete({ where: { id } });
    return { success: true };
  }

  async submit(id: string) {
    const s = await this.get(id);
    if (s.status !== 'DRAFT') throw new BadRequestException('فقط پیش‌نویس قابل ارسال است');
    if (s.items.length === 0) throw new BadRequestException('صورت‌وضعیت باید حداقل یک ردیف داشته باشد');
    return this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async approve(id: string, userId: string) {
    const s = await this.get(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل تایید است');
    return this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async reject(id: string, reason: string) {
    const s = await this.get(id);
    if (s.status !== 'SUBMITTED') throw new BadRequestException('فقط ارسال‌شده قابل رد است');
    return this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'DRAFT', rejectedReason: reason },
    });
  }

  async cancel(id: string) {
    const s = await this.get(id);
    if (s.status === 'PAID') throw new BadRequestException('پرداخت‌شده قابل لغو نیست');
    return this.prisma.clientStatement.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ═══ Post to journal ═══
  private async findAccount(codePrefix: string, label: string) {
    const acc = await this.prisma.account.findFirst({
      where: { code: { startsWith: codePrefix }, isPostable: true, isActive: true },
      orderBy: { code: 'asc' },
    });
    if (!acc) throw new BadRequestException('حساب ' + label + ' (کد ' + codePrefix + '.*) در کدینگ یافت نشد');
    return acc;
  }

  async post(id: string, userId?: string) {
    const s = await this.get(id);
    if (s.status === 'PAID') throw new BadRequestException('قبلاً پرداخت شده است');
    if (s.journalEntryId) throw new BadRequestException('سند حسابداری قبلاً ثبت شده است');

    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: {
        startDate: { lte: s.periodEnd },
        endDate: { gte: s.periodEnd },
        status: 'OPEN',
      },
    });
    if (!fiscalYear) throw new BadRequestException('سال مالی باز متناظر با این دوره یافت نشد');

    const monthKey = s.periodEnd.getFullYear() + '-' +
      String(s.periodEnd.getMonth() + 1).padStart(2, '0');
    const lockedMonths = (fiscalYear.lockedMonths as string[]) || [];
    if (lockedMonths.includes(monthKey)) {
      throw new BadRequestException('دوره ' + monthKey + ' قفل شده است');
    }

    const receivableAcc = await this.findAccount('1.1.2', 'حساب دریافتنی');
    const prepaidLiabilityAcc = await this.findAccount('2.1', 'پیش‌پرداخت دریافتی');
    const revenueAcc = await this.findAccount('4', 'درآمد');

    const netPayable = Number(s.netPayable);
    const prepaymentDeduction = Number(s.prepaymentDeductionAmount);
    const contractorShare = Number(s.contractorShareAmount);

    if (netPayable <= 0 && prepaymentDeduction <= 0) {
      throw new BadRequestException('مبالغ صورت‌وضعیت صفر است');
    }

    return this.prisma.$transaction(async (tx) => {
      const fyUpdate = await tx.fiscalYear.update({
        where: { id: fiscalYear.id },
        data: { nextEntryNumber: { increment: 1 } },
        select: { nextEntryNumber: true, code: true },
      });
      const entryNumber = fyUpdate.nextEntryNumber - 1;
      const entryCode = 'JV-' + fyUpdate.code + '-' + String(entryNumber).padStart(5, '0');

      const lines: any[] = [];
      if (netPayable > 0) {
        lines.push({
          accountId: receivableAcc.id,
          description: 'دریافتنی صورت‌وضعیت ' + s.code + ' - ' + s.project.name,
          debit: netPayable,
          credit: 0,
          projectId: s.projectId,
          sortOrder: 1,
        });
      }
      if (prepaymentDeduction > 0) {
        lines.push({
          accountId: prepaidLiabilityAcc.id,
          description: 'استهلاک پیش‌پرداخت ' + s.code,
          debit: prepaymentDeduction,
          credit: 0,
          projectId: s.projectId,
          sortOrder: 2,
        });
      }
      lines.push({
        accountId: revenueAcc.id,
        description: 'درآمد صورت‌وضعیت ' + s.code + ' - ' + s.project.name,
        debit: 0,
        credit: contractorShare,
        projectId: s.projectId,
        sortOrder: 3,
      });

      const totalDebit = netPayable + prepaymentDeduction;
      const totalCredit = contractorShare;

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new BadRequestException(
          'عدم توازن در سند: بدهکار ' + totalDebit.toFixed(2) + ' ≠ بستانکار ' + totalCredit.toFixed(2),
        );
      }

      const entry = await tx.journalEntry.create({
        data: {
          code: entryCode,
          entryNumber,
          entryDate: s.periodEnd,
          fiscalYearId: fiscalYear.id,
          description: 'صورت‌وضعیت کارفرما ' + s.code + ' - ' + s.project.name,
          reference: s.code,
          status: 'POSTED',
          postedAt: new Date(),
          sourceType: 'CLIENT_STATEMENT',
          sourceId: s.id,
          createdById: userId,
          totalDebit,
          totalCredit,
          lines: { create: lines },
        },
      });

      return tx.clientStatement.update({
        where: { id },
        data: {
          journalEntryId: entry.id,
          status: s.status === 'DRAFT' || s.status === 'SUBMITTED' ? 'APPROVED' : s.status,
          approvedAt: s.approvedAt || new Date(),
          approvedById: s.approvedById || userId,
        },
        include: { journalEntry: { select: { id: true, code: true } } },
      });
    });
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
`);

// ═══════════════════════════════════════════════════════════
// 3. Controller
// ═══════════════════════════════════════════════════════════
write(BE + '/src/modules/client-statement/client-statement.controller.ts', `import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientStatementService } from './client-statement.service';
import {
  CreateCSDto, UpdateCSDto, ImportCSItemsDto, RejectCSDto,
} from './dto/client-statement.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Client Statement - صورت‌وضعیت کارفرما')
@ApiBearerAuth()
@Controller('client-statements')
export class ClientStatementController {
  constructor(private service: ClientStatementService) {}

  @Get()
  @RequirePermissions('client-statement.read')
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) { return this.service.list({ projectId, status, search }); }

  @Get('stats')
  @RequirePermissions('client-statement.read')
  stats(@Query('projectId') projectId?: string) {
    return this.service.stats(projectId);
  }

  @Get('next-number/:projectId')
  @RequirePermissions('client-statement.read')
  nextNumber(@Param('projectId') projectId: string) {
    return this.service.nextStatementNumber(projectId);
  }

  @Get(':id')
  @RequirePermissions('client-statement.read')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Post()
  @RequirePermissions('client-statement.manage')
  create(@Body() dto: CreateCSDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermissions('client-statement.manage')
  update(@Param('id') id: string, @Body() dto: UpdateCSDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('client-statement.manage')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/items/import')
  @RequirePermissions('client-statement.manage')
  importItems(@Param('id') id: string, @Body() dto: ImportCSItemsDto) {
    return this.service.importItems(id, dto);
  }

  @Delete('items/:itemId')
  @RequirePermissions('client-statement.manage')
  deleteItem(@Param('itemId') itemId: string) { return this.service.deleteItem(itemId); }

  @Post(':id/submit')
  @RequirePermissions('client-statement.manage')
  submit(@Param('id') id: string) { return this.service.submit(id); }

  @Post(':id/approve')
  @RequirePermissions('approvals.approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Post(':id/reject')
  @RequirePermissions('approvals.approve')
  reject(@Param('id') id: string, @Body() dto: RejectCSDto) {
    return this.service.reject(id, dto.reason);
  }

  @Post(':id/post')
  @RequirePermissions('client-statement.manage')
  post(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.post(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('client-statement.manage')
  cancel(@Param('id') id: string) { return this.service.cancel(id); }
}
`);

// ═══════════════════════════════════════════════════════════
// 4. Module
// ═══════════════════════════════════════════════════════════
write(BE + '/src/modules/client-statement/client-statement.module.ts', `import { Module } from '@nestjs/common';
import { ClientStatementService } from './client-statement.service';
import { ClientStatementController } from './client-statement.controller';

@Module({
  controllers: [ClientStatementController],
  providers: [ClientStatementService],
  exports: [ClientStatementService],
})
export class ClientStatementModule {}
`);

// ═══════════════════════════════════════════════════════════
// 5. Patch app.module.ts
// ═══════════════════════════════════════════════════════════
patch(BE + '/src/app.module.ts', (c) => {
  if (!c.includes('ClientStatementModule')) {
    c = c.replace(
      "import { OverheadModule } from './modules/overhead/overhead.module';",
      "import { OverheadModule } from './modules/overhead/overhead.module';" + NL +
      "import { ClientStatementModule } from './modules/client-statement/client-statement.module';"
    );
  }
  if (!c.includes('ClientStatementModule,')) {
    c = c.replace(
      '    OverheadModule,',
      '    OverheadModule,' + NL + '    ClientStatementModule,'
    );
  }
  return c;
}, 'app.module.ts');

// ═══════════════════════════════════════════════════════════
// 6. Patch seed-permissions.mjs
// ═══════════════════════════════════════════════════════════
patch(BE + '/prisma/seed-permissions.mjs', (c) => {
  if (c.includes('client-statement.read')) return c;
  const anchor = "  ['overhead.manage', 'مدیریت تسهیم سربار'],";
  if (!c.includes(anchor)) return c;
  const block = anchor + NL + NL +
    "  // صورت‌وضعیت کارفرما" + NL +
    "  ['client-statement.read',   'مشاهده صورت‌وضعیت کارفرما']," + NL +
    "  ['client-statement.manage', 'مدیریت صورت‌وضعیت کارفرما'],";
  return c.replace(anchor, block);
}, 'seed-permissions.mjs');

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  Step 3.2.2 — Backend complete.');
console.log('  Next:');
console.log('    cd E:/EpsayAccounting/backend');
console.log('    node prisma/seed-permissions.mjs');
console.log('    npm run start:dev');
console.log('═══════════════════════════════════════════════');