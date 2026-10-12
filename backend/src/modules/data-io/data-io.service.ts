import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class DataIoService {
  constructor(private prisma: PrismaService) {}

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
      code: r.code, name: r.name, type: r.type, unit: r.unit,
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
      unit: r.unit || '',
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
  async importPartners(rows: any[]) {
    const errors: any[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }
        const data: any = {
          code: String(r.code).trim(),
          name: String(r.name || '').trim(),
          type: (r.type && ['CLIENT','CONSULTANT','CONTRACTOR','SUPPLIER','EMPLOYEE','PARTNER','OTHER'].includes(r.type)) ? r.type : 'OTHER',
          fatherName: r.fatherName || null,
          nationalId: r.nationalId || null,
          phone: r.phone || null,
          email: r.email || null,
          postalCode: r.postalCode || null,
          address: r.address || null,
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
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importItems(rows: any[]) {
    const errors: any[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }
        let categoryId: string | undefined;
        if (r.categoryCode) {
          const cat = await this.prisma.itemCategory.findUnique({ where: { code: String(r.categoryCode).trim() } });
          if (cat) categoryId = cat.id;
        }
        const data: any = {
          code: String(r.code).trim(),
          name: String(r.name || '').trim(),
          type: (r.type && ['CONSUMABLE','CAPITAL','MATERIAL'].includes(r.type)) ? r.type : 'MATERIAL',
          unit: r.unit || 'NUMBER',
          categoryId,
          minStock: r.minStock ?? null,
          maxStock: r.maxStock ?? null,
          reorderPoint: r.reorderPoint ?? null,
          isActive: r.isActive !== false,
        };
        if (!data.name) { errors.push({ row: i + 1, error: 'نام الزامی است' }); continue; }

        const existing = await this.prisma.item.findUnique({ where: { code: data.code } });
        if (existing) {
          await this.prisma.item.update({ where: { code: data.code }, data });
          updated++;
        } else {
          await this.prisma.item.create({ data });
          created++;
        }
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importWbs(rows: any[]) {
    const errors: any[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.projectCode) { errors.push({ row: i + 1, error: 'کد پروژه الزامی است' }); continue; }
        if (!r.code) { errors.push({ row: i + 1, error: 'کد WBS الزامی است' }); continue; }

        const project = await this.prisma.project.findUnique({ where: { code: String(r.projectCode).trim() } });
        if (!project) { errors.push({ row: i + 1, error: 'پروژه با کد ' + r.projectCode + ' یافت نشد' }); continue; }

        let parentId: string | undefined;
        if (r.parentCode) {
          const parent = await this.prisma.wbsItem.findFirst({
            where: { projectId: project.id, code: String(r.parentCode).trim() },
          });
          if (parent) parentId = parent.id;
        }

        const data: any = {
          projectId: project.id,
          code: String(r.code).trim(),
          title: String(r.title || '').trim(),
          level: r.level || 'ACTIVITY',
          parentId,
          unit: r.unit || null,
          quantity: r.quantity ?? null,
          unitPrice: r.unitPrice ?? null,
          totalPrice: (r.quantity != null && r.unitPrice != null) ? Number(r.quantity) * Number(r.unitPrice) : null,
          sortOrder: r.sortOrder ?? 0,
          description: r.description || null,
        };

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
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    return { total: rows.length, created, updated, errors };
  }

  async importAccounts(rows: any[]) {
    const errors: any[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.code) { errors.push({ row: i + 1, error: 'کد الزامی است' }); continue; }

        let parentId: string | undefined;
        if (r.parentCode) {
          const parent = await this.prisma.account.findUnique({ where: { code: String(r.parentCode).trim() } });
          if (parent) parentId = parent.id;
        }

        const data: any = {
          code: String(r.code).trim(),
          name: String(r.name || '').trim(),
          level: r.level || 'DETAIL',
          nature: r.nature || 'DEBIT',
          subtype: r.subtype || null,
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
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    return { total: rows.length, created, updated, errors };
  }
}
