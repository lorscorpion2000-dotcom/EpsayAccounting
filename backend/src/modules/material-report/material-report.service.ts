import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class MaterialReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * گزارش مصرف مصالح — به تفکیک پروژه/WBS/کالا
   */
  async consumption(params: {
    projectId?: string;
    wbsItemId?: string;
    itemId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {
      type: 'OUT',
    };
    if (params.projectId) where.projectId = params.projectId;
    if (params.wbsItemId) where.wbsItemId = params.wbsItemId;
    if (params.itemId) where.itemId = params.itemId;
    if (params.fromDate || params.toDate) {
      where.movementDate = {};
      if (params.fromDate) where.movementDate.gte = new Date(params.fromDate);
      if (params.toDate) where.movementDate.lte = new Date(params.toDate);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, code: true, name: true, unit: true, category: { select: { name: true } } } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      take: 2000,
    });

    // Fetch project/wbs info separately
    const projectIds = [...new Set(movements.map((m) => m.projectId).filter(Boolean))] as string[];
    const wbsIds = [...new Set(movements.map((m) => m.wbsItemId).filter(Boolean))] as string[];

    const projects = projectIds.length > 0 ? await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, code: true, name: true },
    }) : [];
    const wbsItems = wbsIds.length > 0 ? await this.prisma.wbsItem.findMany({
      where: { id: { in: wbsIds } },
      select: { id: true, code: true, title: true },
    }) : [];

    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const wbsMap = new Map(wbsItems.map((w) => [w.id, w]));

    const rows = movements.map((m) => ({
      id: m.id,
      date: m.movementDate,
      itemId: m.item.id,
      itemCode: m.item.code,
      itemName: m.item.name,
      category: m.item.category?.name || '',
      unit: m.item.unit,
      quantity: Number(m.quantity),
      unitCost: Number(m.unitCost),
      totalCost: Number(m.totalCost),
      warehouseName: m.warehouse.name,
      projectId: m.projectId,
      projectCode: m.projectId ? projectMap.get(m.projectId)?.code || '' : '',
      projectName: m.projectId ? projectMap.get(m.projectId)?.name || '' : '',
      wbsItemId: m.wbsItemId,
      wbsCode: m.wbsItemId ? wbsMap.get(m.wbsItemId)?.code || '' : '',
      wbsTitle: m.wbsItemId ? wbsMap.get(m.wbsItemId)?.title || '' : '',
      description: m.description,
      referenceCode: m.referenceCode,
    }));

    // Aggregations
    const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);

    // Group by item
    const byItemMap = new Map<string, any>();
    for (const r of rows) {
      if (!byItemMap.has(r.itemId)) {
        byItemMap.set(r.itemId, {
          itemId: r.itemId,
          itemCode: r.itemCode,
          itemName: r.itemName,
          category: r.category,
          unit: r.unit,
          totalQuantity: 0,
          totalCost: 0,
          count: 0,
        });
      }
      const e = byItemMap.get(r.itemId);
      e.totalQuantity += r.quantity;
      e.totalCost += r.totalCost;
      e.count += 1;
    }

    // Group by project
    const byProjectMap = new Map<string, any>();
    for (const r of rows) {
      if (!r.projectId) continue;
      if (!byProjectMap.has(r.projectId)) {
        byProjectMap.set(r.projectId, {
          projectId: r.projectId,
          projectCode: r.projectCode,
          projectName: r.projectName,
          totalCost: 0,
          count: 0,
        });
      }
      const e = byProjectMap.get(r.projectId);
      e.totalCost += r.totalCost;
      e.count += 1;
    }

    return {
      summary: {
        totalRows: rows.length,
        totalCost,
        uniqueItems: byItemMap.size,
      },
      byItem: Array.from(byItemMap.values()).sort((a, b) => b.totalCost - a.totalCost),
      byProject: Array.from(byProjectMap.values()).sort((a, b) => b.totalCost - a.totalCost),
      rows,
    };
  }

  /**
   * بهای واحد WBS — مجموع همه هزینه‌ها روی یک WBS
   */
  async wbsUnitCost(projectId: string, wbsItemId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const whereWbs: any = { projectId };
    if (wbsItemId) whereWbs.id = wbsItemId;

    const wbsItems = await this.prisma.wbsItem.findMany({
      where: whereWbs,
      orderBy: { code: 'asc' },
    });

    const result = await Promise.all(wbsItems.map(async (wbs) => {
      // مواد مصرفی: StockMovement type=OUT with wbsItemId
      const materialAgg = await this.prisma.stockMovement.aggregate({
        where: { wbsItemId: wbs.id, type: 'OUT' },
        _sum: { totalCost: true },
      });
      const materialCost = Number(materialAgg._sum.totalCost || 0);

      // دستمزد: از گزارش روزانه پیشرفت که به این WBS اشاره دارد؟
      // بهتر: از payrollRecords که تسهیم شده روی این WBS نیست
      // پس استفاده می‌کنیم از dailyReportWorkers که این wbsItemId دارد و از payroll محاسبه نمی‌شود
      // در این ماژول فقط جمع می‌کنیم بر اساس SubcontractorStatementItem
      const subAgg = await this.prisma.subcontractorStatementItem.aggregate({
        where: { wbsItemId: wbs.id, statement: { status: { in: ['APPROVED', 'PAID'] } } },
        _sum: { totalPrice: true },
      });
      const subCost = Number(subAgg._sum.totalPrice || 0);

      // ماشین‌آلات: EquipmentDailyLog با wbsItemId
      const equipAgg = await this.prisma.equipmentDailyLog.aggregate({
        where: { wbsItemId: wbs.id },
        _sum: { computedCost: true, fuelCost: true },
      });
      const equipmentCost = Number(equipAgg._sum.computedCost || 0) + Number(equipAgg._sum.fuelCost || 0);

      // سربار: OverheadAllocationItem که پروژه‌اش این است (به WBS نمی‌شود مستقیماً تخصیص داد)
      // برای این بخش، سربار تسهیم‌شده به پروژه را به نسبت مبلغ WBS تقسیم می‌کنیم
      const overheadAgg = await this.prisma.overheadAllocationItem.aggregate({
        where: { projectId, allocation: { status: 'POSTED' } },
        _sum: { amount: true },
      });
      const totalProjectOverhead = Number(overheadAgg._sum.amount || 0);

      // درصد این WBS از کل پروژه (بر اساس مبلغ)
      const totalWbsValue = await this.prisma.wbsItem.aggregate({
        where: { projectId, isPostable: true } as any,
        _sum: { totalPrice: true },
      });
      const projectWbsTotal = Number(totalWbsValue._sum.totalPrice || 0);
      const wbsWeight = projectWbsTotal > 0 ? Number(wbs.totalPrice || 0) / projectWbsTotal : 0;
      const overheadShare = totalProjectOverhead * wbsWeight;

      const totalCost = materialCost + subCost + equipmentCost + overheadShare;

      // بهای واحد
      const quantity = Number(wbs.quantity || 0);
      const unitCost = quantity > 0 ? totalCost / quantity : 0;

      return {
        wbsId: wbs.id,
        wbsCode: wbs.code,
        wbsTitle: wbs.title,
        level: wbs.level,
        unit: wbs.unit,
        quantity,
        contractUnitPrice: Number(wbs.unitPrice || 0),
        contractTotalPrice: Number(wbs.totalPrice || 0),
        materialCost,
        subCost,
        equipmentCost,
        overheadShare,
        totalCost,
        unitCost,
        deviation: Number(wbs.unitPrice || 0) - unitCost,
        deviationPct: Number(wbs.unitPrice || 0) > 0
          ? ((Number(wbs.unitPrice || 0) - unitCost) / Number(wbs.unitPrice || 0)) * 100
          : 0,
      };
    }));

    const totals = result.reduce(
      (acc, r) => ({
        materialCost: acc.materialCost + r.materialCost,
        subCost: acc.subCost + r.subCost,
        equipmentCost: acc.equipmentCost + r.equipmentCost,
        overheadShare: acc.overheadShare + r.overheadShare,
        totalCost: acc.totalCost + r.totalCost,
        contractTotalPrice: acc.contractTotalPrice + r.contractTotalPrice,
      }),
      { materialCost: 0, subCost: 0, equipmentCost: 0, overheadShare: 0, totalCost: 0, contractTotalPrice: 0 },
    );

    return {
      project,
      rows: result,
      totals: {
        ...totals,
        profit: totals.contractTotalPrice - totals.totalCost,
        profitPct: totals.contractTotalPrice > 0
          ? ((totals.contractTotalPrice - totals.totalCost) / totals.contractTotalPrice) * 100
          : 0,
      },
    };
  }
}
