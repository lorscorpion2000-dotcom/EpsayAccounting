import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class OperationalReportsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // 1) گزارش راندمان ماشین‌آلات
  // ═══════════════════════════════════════════════════════════
  async equipmentEfficiency(params: {
    fromDate: string;
    toDate: string;
    projectId?: string;
    equipmentId?: string;
  }) {
    const where: any = {
      deletedAt: null,
      logDate: {
        gte: new Date(params.fromDate),
        lte: new Date(params.toDate),
      },
    };
    if (params.projectId) where.projectId = params.projectId;
    if (params.equipmentId) where.equipmentId = params.equipmentId;

    const logs = await this.prisma.equipmentDailyLog.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true, code: true, name: true, ownership: true,
            hourlyRate: true, dailyRate: true,
            fuelNormPerHour: true, fuelType: true, brand: true, model: true,
          },
        },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ logDate: 'desc' }],
    });

    // گروه‌بندی به تفکیک ماشین
    const byEq = new Map<string, any>();
    for (const l of logs) {
      const eq = l.equipment;
      if (!eq) continue;
      if (!byEq.has(eq.id)) {
        byEq.set(eq.id, {
          equipmentId: eq.id,
          code: eq.code,
          name: eq.name,
          brand: eq.brand,
          model: eq.model,
          ownership: eq.ownership,
          fuelType: eq.fuelType,
          hourlyRate: Number(eq.hourlyRate || 0),
          fuelNormPerHour: Number(eq.fuelNormPerHour || 0),
          totalWorkHours: 0,
          totalIdleHours: 0,
          totalStopHours: 0,
          totalBreakdownHours: 0,
          totalFuelLiters: 0,
          totalFuelCost: 0,
          totalComputedCost: 0,
          logCount: 0,
          projects: new Set<string>(),
        });
      }
      const e = byEq.get(eq.id);
      e.totalWorkHours += Number(l.workHours);
      e.totalIdleHours += Number(l.idleHours);
      e.totalStopHours += Number(l.stopHours);
      e.totalBreakdownHours += Number(l.breakdownHours);
      e.totalFuelLiters += Number(l.fuelLiters);
      e.totalFuelCost += Number(l.fuelCost);
      e.totalComputedCost += Number(l.computedCost);
      e.logCount += 1;
      if (l.project?.name) e.projects.add(l.project.name);
    }

    const items = Array.from(byEq.values()).map((e) => {
      const fuelPerHour = e.totalWorkHours > 0
        ? e.totalFuelLiters / e.totalWorkHours
        : 0;
      const normDiff = e.fuelNormPerHour > 0
        ? ((fuelPerHour - e.fuelNormPerHour) / e.fuelNormPerHour) * 100
        : 0;
      const availabilityRate = (e.totalWorkHours + e.totalIdleHours + e.totalStopHours + e.totalBreakdownHours) > 0
        ? (e.totalWorkHours / (e.totalWorkHours + e.totalIdleHours + e.totalStopHours + e.totalBreakdownHours)) * 100
        : 0;

      return {
        ...e,
        projects: Array.from(e.projects).join('، '),
        fuelPerHour: Math.round(fuelPerHour * 100) / 100,
        normDiffPct: Math.round(normDiff * 100) / 100,
        fuelCompliance: e.fuelNormPerHour === 0
          ? 'N/A'
          : normDiff > 15 ? 'OVER' : normDiff < -15 ? 'UNDER' : 'NORMAL',
        availabilityRate: Math.round(availabilityRate * 100) / 100,
        avgHourlyCost: e.totalWorkHours > 0
          ? Math.round(e.totalComputedCost / e.totalWorkHours)
          : 0,
      };
    });

    // مرتب‌سازی بر اساس ساعت کار
    items.sort((a, b) => b.totalWorkHours - a.totalWorkHours);

    const totals = {
      totalEquipments: items.length,
      totalWorkHours: Math.round(items.reduce((s, e) => s + e.totalWorkHours, 0) * 100) / 100,
      totalIdleHours: Math.round(items.reduce((s, e) => s + e.totalIdleHours, 0) * 100) / 100,
      totalStopHours: Math.round(items.reduce((s, e) => s + e.totalStopHours, 0) * 100) / 100,
      totalBreakdownHours: Math.round(items.reduce((s, e) => s + e.totalBreakdownHours, 0) * 100) / 100,
      totalFuelLiters: Math.round(items.reduce((s, e) => s + e.totalFuelLiters, 0) * 100) / 100,
      totalFuelCost: Math.round(items.reduce((s, e) => s + e.totalFuelCost, 0)),
      totalCost: Math.round(items.reduce((s, e) => s + e.totalComputedCost, 0)),
      totalLogs: logs.length,
    };

    return {
      period: { from: params.fromDate, to: params.toDate },
      items,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 2) گزارش عملکرد پیمانکاران جزء
  // ═══════════════════════════════════════════════════════════
  async subcontractorPerformance(params: {
    projectId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const stmtWhere: any = {};
    if (params.projectId) stmtWhere.projectId = params.projectId;
    if (params.fromDate || params.toDate) {
      stmtWhere.periodEnd = {};
      if (params.fromDate) stmtWhere.periodEnd.gte = new Date(params.fromDate);
      if (params.toDate) stmtWhere.periodEnd.lte = new Date(params.toDate);
    }

    const statements = await this.prisma.subcontractorStatement.findMany({
      where: stmtWhere,
      include: {
        contractor: {
          select: { id: true, code: true, name: true, nationalId: true, phone: true },
        },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // گروه‌بندی به تفکیک پیمانکار
    const byContractor = new Map<string, any>();
    for (const s of statements) {
      const c = s.contractor;
      if (!c) continue;
      if (!byContractor.has(c.id)) {
        byContractor.set(c.id, {
          contractorId: c.id,
          code: c.code,
          name: c.name,
          nationalId: c.nationalId,
          phone: c.phone,
          statementCount: 0,
          approvedCount: 0,
          paidCount: 0,
          draftCount: 0,
          totalAmount: 0,
          totalDeduction: 0,
          netPayable: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          projects: new Set<string>(),
        });
      }
      const e = byContractor.get(c.id);
      e.statementCount += 1;
      e.totalAmount += Number(s.totalAmount);
      e.totalDeduction += Number(s.totalDeduction);
      e.netPayable += Number(s.netPayable);
      if (s.status === 'APPROVED') e.approvedCount += 1;
      if (s.status === 'PAID') {
        e.paidCount += 1;
        e.paidAmount += Number(s.netPayable);
      }
      if (s.status === 'DRAFT') e.draftCount += 1;
      if (s.project?.name) e.projects.add(s.project.name);
    }

    const items = Array.from(byContractor.values()).map((c) => ({
      ...c,
      projects: Array.from(c.projects).join('، '),
      unpaidAmount: c.netPayable - c.paidAmount,
    }));

    items.sort((a, b) => b.netPayable - a.netPayable);

    const totals = {
      totalContractors: items.length,
      totalStatements: statements.length,
      totalAmount: Math.round(items.reduce((s, c) => s + c.totalAmount, 0)),
      totalDeduction: Math.round(items.reduce((s, c) => s + c.totalDeduction, 0)),
      totalNetPayable: Math.round(items.reduce((s, c) => s + c.netPayable, 0)),
      totalPaid: Math.round(items.reduce((s, c) => s + c.paidAmount, 0)),
      totalUnpaid: Math.round(items.reduce((s, c) => s + c.unpaidAmount, 0)),
    };

    return {
      period: { from: params.fromDate, to: params.toDate },
      items,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 3) گزارش مغایرت انبار (سیستم vs فیزیکی)
  // ═══════════════════════════════════════════════════════════
  async warehouseDiscrepancy(params: {
    fromDate: string;
    toDate: string;
    warehouseId?: string;
    itemId?: string;
  }) {
    const where: any = {
      countDate: {
        gte: new Date(params.fromDate),
        lte: new Date(params.toDate),
      },
      status: { in: ['CONFIRMED', 'POSTED'] },
    };
    if (params.warehouseId) where.warehouseId = params.warehouseId;

    const counts = await this.prisma.inventoryCount.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { countDate: 'desc' },
    });

    // ساخت ردیف‌ها
    const rows: any[] = [];
    for (const c of counts) {
      for (const it of c.items) {
        if (params.itemId && it.itemId !== params.itemId) continue;
        if (Math.abs(Number(it.difference)) < 0.0001) continue; // فقط اختلاف‌دارها

        rows.push({
          countId: c.id,
          countCode: c.code,
          countDate: c.countDate,
          warehouseId: c.warehouse?.id,
          warehouseName: c.warehouse?.name,
          itemId: it.item?.id,
          itemCode: it.item?.code,
          itemName: it.item?.name,
          unit: it.item?.unit,
          systemQty: Number(it.systemQty),
          physicalQty: Number(it.physicalQty),
          difference: Number(it.difference),
          unitCost: Number(it.unitCost),
          differenceCost: Number(it.differenceCost),
          notes: it.notes,
        });
      }
    }

    // گروه‌بندی به تفکیک کالا برای تحلیل روند
    const byItem = new Map<string, any>();
    for (const r of rows) {
      if (!r.itemId) continue;
      if (!byItem.has(r.itemId)) {
        byItem.set(r.itemId, {
          itemId: r.itemId,
          itemCode: r.itemCode,
          itemName: r.itemName,
          unit: r.unit,
          countOccurrences: 0,
          totalQtyDiff: 0,
          totalCostDiff: 0,
          positiveDiffCount: 0,
          negativeDiffCount: 0,
        });
      }
      const e = byItem.get(r.itemId);
      e.countOccurrences += 1;
      e.totalQtyDiff += r.difference;
      e.totalCostDiff += r.differenceCost;
      if (r.difference > 0) e.positiveDiffCount += 1;
      if (r.difference < 0) e.negativeDiffCount += 1;
    }

    const itemSummary = Array.from(byItem.values())
      .sort((a, b) => Math.abs(b.totalCostDiff) - Math.abs(a.totalCostDiff));

    const totals = {
      totalCounts: counts.length,
      totalRows: rows.length,
      totalQtyDiff: Math.round(rows.reduce((s, r) => s + r.difference, 0) * 100) / 100,
      totalCostDiff: Math.round(rows.reduce((s, r) => s + r.differenceCost, 0)),
      positiveCostDiff: Math.round(rows.filter((r) => r.differenceCost > 0).reduce((s, r) => s + r.differenceCost, 0)),
      negativeCostDiff: Math.round(rows.filter((r) => r.differenceCost < 0).reduce((s, r) => s + r.differenceCost, 0)),
      uniqueItems: byItem.size,
    };

    return {
      period: { from: params.fromDate, to: params.toDate },
      rows,
      itemSummary,
      totals,
    };
  }
}
