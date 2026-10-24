import { Injectable } from '@nestjs/common';
import {
  Prisma, PartnerType, ItemType, AccountLevel, AccountNature, AccountSubtype, WbsLevel,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface ImportError { row: number; error: string }
export interface ImportResult { total: number; created: number; updated: number; errors: ImportError[] }
type ImportRow = Record<string, unknown>;

const PARTNER_TYPES = ['CLIENT', 'CONSULTANT', 'CONTRACTOR', 'SUPPLIER', 'EMPLOYEE', 'PARTNER', 'OTHER'] as const;
const ITEM_TYPES = ['CONSUMABLE', 'CAPITAL', 'MATERIAL'] as const;

function str(v: unknown): string | undefined {
  if (!v) return undefined;
  return String(v).trim() || undefined;
}

function decimal(v: unknown): string | number | null {
  if (typeof v === 'number' || typeof v === 'string') return v;
  return null;
}

@Injectable()
export class DataIoService {
  constructor(private prisma: PrismaService) {}

  private async resolveUnitId(code?: string | null): Promise<string | null> {
    if (!code) return null;
    const u = await this.prisma.unit.findFirst({
      where: { OR: [{ code }, { name: code }, { symbol: code }] },
      select: { id: true },
    });
    return u?.id ?? null;
  }


  // ═══ Export ═══
  async exportPartners() {
    return this.prisma.partner.findMany({
      orderBy: { code: 'asc' },
      select: {
        code: true, name: true, type: true, fatherName: true,
        nationalId: true, phone: true, email: true,
        postalCode: true, address: true, isActive: true,
      },
    });
  }

  async exportItems() {
    return this.prisma.item.findMany({
      orderBy: { code: 'asc' },
      include: { category: { select: { code: true, name: true } } },
    }).then((rows) => rows.map((r) => ({
      code: r.code, name: r.name, type: r.type, 
      categoryCode: r.category?.code || '',
      categoryName: r.category?.name || '',
      minStock: r.minStock, maxStock: r.maxStock,
      reorderPoint: r.reorderPoint, isActive: r.isActive,
    })));
  }

  async exportWbs(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.wbsItem.findMany({
      where,
      orderBy: [{ projectId: 'asc' }, { code: 'asc' }],
      include: {
        project: { select: { code: true, name: true } },
        parent: { select: { code: true } },
      },
    }).then((rows) => rows.map((r) => ({
      projectCode: r.project.code,
      projectName: r.project.name,
      code: r.code,
      title: r.title,
      level: r.level,
      parentCode: r.parent?.code || '',
      
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      sortOrder: r.sortOrder,
      description: r.description || '',
    })));
  }

  async exportAccounts() {
    return this.prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: { parent: { select: { code: true } } },
    }).then((rows) => rows.map((r) => ({
      code: r.code, name: r.name, level: r.level,
      nature: r.nature, subtype: r.subtype || '',
      parentCode: r.parent?.code || '',
      isPostable: r.isPostable, isActive: r.isActive,
    })));
  }

  // ═══ Import ═══
  async importPartners(rows: readonly unknown[]): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as ImportRow;
      try {
        const code = str(r.code);
        if (!code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }
        const typeStr = str(r.type);
        const type: PartnerType = typeStr && (PARTNER_TYPES as readonly string[]).includes(typeStr)
          ? (typeStr as PartnerType) : 'OTHER';
        const data: Prisma.PartnerUncheckedCreateInput = {
          code,
          name: str(r.name) ?? '',
          type,
          fatherName: str(r.fatherName) ?? null,
          nationalId: str(r.nationalId) ?? null,
          phone: str(r.phone) ?? null,
          email: str(r.email) ?? null,
          postalCode: str(r.postalCode) ?? null,
          address: str(r.address) ?? null,
          isActive: r.isActive !== false,
        };
        if (!data.name) { errors.push({ row: i + 1, error: 'نام الزامی است' }); continue; }

        const existing = await this.prisma.partner.findUnique({ where: { code: data.code } });
        if (existing) {
          await this.prisma.partner.update({ where: { code: data.code }, data });
          updated++;
        } else {
          await this.prisma.partner.create({ data });
          created++;
        }
      } catch (e) {
        errors.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importItems(rows: readonly unknown[]): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as ImportRow;
      try {
        const code = str(r.code);
        if (!code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }
        let categoryId: string | undefined;
        const categoryCode = str(r.categoryCode);
        if (categoryCode) {
          const cat = await this.prisma.itemCategory.findUnique({ where: { code: categoryCode } });
          if (cat) categoryId = cat.id;
        }
        const typeStr = str(r.type);
        const itemType: ItemType = typeStr && (ITEM_TYPES as readonly string[]).includes(typeStr)
          ? (typeStr as ItemType) : 'MATERIAL';
        const data = {
          code,
          name: str(r.name) ?? '',
          type: itemType,
          unit: str(r.unit) ?? 'NUMBER',
          categoryId,
          minStock: decimal(r.minStock),
          maxStock: decimal(r.maxStock),
          reorderPoint: decimal(r.reorderPoint),
          isActive: r.isActive !== false,
        } as unknown as Prisma.ItemUncheckedCreateInput;
        if (!data.name) { errors.push({ row: i + 1, error: 'نام الزامی است' }); continue; }

        const existing = await this.prisma.item.findUnique({ where: { code: data.code } });
        if (existing) {
          await this.prisma.item.update({ where: { code: data.code }, data });
          updated++;
        } else {
          await this.prisma.item.create({ data });
          created++;
        }
      } catch (e) {
        errors.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importWbs(rows: readonly unknown[]): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as ImportRow;
      try {
        const projectCode = str(r.projectCode);
        if (!projectCode) { errors.push({ row: i + 1, error: 'کد پروژه الزامی است' }); continue; }
        const code = str(r.code);
        if (!code) { errors.push({ row: i + 1, error: 'کد WBS الزامی است' }); continue; }

        const project = await this.prisma.project.findUnique({ where: { code: projectCode } });
        if (!project) { errors.push({ row: i + 1, error: 'پروژه با کد ' + projectCode + ' یافت نشد' }); continue; }

        let parentId: string | undefined;
        const parentCode = str(r.parentCode);
        if (parentCode) {
          const parent = await this.prisma.wbsItem.findFirst({
            where: { projectId: project.id, code: parentCode },
          });
          if (parent) parentId = parent.id;
        }

        const unitStr = str(r.unit);
        const unitId = await this.resolveUnitId(unitStr ?? null);
        const levelStr = str(r.level);
        const level: WbsLevel = (levelStr as WbsLevel | undefined) ?? 'ACTIVITY';
        const data = {
          projectId: project.id,
          code,
          title: str(r.title) ?? '',
          level,
          parentId,
          unit: unitStr ?? null,
          unitId,
          quantity: decimal(r.quantity),
          unitPrice: decimal(r.unitPrice),
          totalPrice: (r.quantity != null && r.unitPrice != null)
            ? Number(r.quantity) * Number(r.unitPrice) : null,
          sortOrder: (r.sortOrder ?? 0) as number,
          description: str(r.description) ?? null,
        } as unknown as Prisma.WbsItemUncheckedCreateInput;

        const existing = await this.prisma.wbsItem.findFirst({
          where: { projectId: project.id, code: data.code },
        });
        if (existing) {
          await this.prisma.wbsItem.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await this.prisma.wbsItem.create({ data });
          created++;
        }
      } catch (e) {
        errors.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importAccounts(rows: readonly unknown[]): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as ImportRow;
      try {
        const code = str(r.code);
        if (!code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }

        let parentId: string | undefined;
        const parentCode = str(r.parentCode);
        if (parentCode) {
          const parent = await this.prisma.account.findUnique({ where: { code: parentCode } });
          if (parent) parentId = parent.id;
        }

        const levelStr = str(r.level);
        const natureStr = str(r.nature);
        const subtypeStr = str(r.subtype);
        const data: Prisma.AccountUncheckedCreateInput = {
          code,
          name: str(r.name) ?? '',
          level: (levelStr || 'DETAIL') as AccountLevel,
          nature: (natureStr || 'DEBIT') as AccountNature,
          subtype: subtypeStr ? (subtypeStr as AccountSubtype) : null,
          parentId,
          isPostable: r.isPostable !== false,
          isActive: r.isActive !== false,
        };

        const existing = await this.prisma.account.findUnique({ where: { code: data.code } });
        if (existing) {
          await this.prisma.account.update({ where: { code: data.code }, data });
          updated++;
        } else {
          await this.prisma.account.create({ data });
          created++;
        }
      } catch (e) {
        errors.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: rows.length, created, updated, errors };
  }
}
