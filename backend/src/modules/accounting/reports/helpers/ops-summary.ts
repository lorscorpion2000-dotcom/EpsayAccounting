import type { PrismaService } from '../../../../shared/prisma/prisma.service';

export async function warehouseSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const [receipts, issues, movements] = await Promise.all([
    prisma.goodsReceipt.findMany({
      where: { projectId, receiptDate: { gte: from, lte: to } },
      include: { warehouse: { select: { name: true } } },
    }),
    prisma.goodsIssue.findMany({
      where: { projectId, issueDate: { gte: from, lte: to } },
      include: { warehouse: { select: { name: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { projectId, movementDate: { gte: from, lte: to } },
      include: { item: { select: { code: true, name: true, unitObj: { select: { name: true } } } } },
    }),
  ]);

  const totalIn = receipts.reduce((s, r) => s + Number(r.totalValue), 0);
  const totalOut = issues.reduce((s, i) => s + Number(i.totalValue), 0);

  const consumption: Record<string, any> = {};
  for (const m of movements) {
    if (m.type !== 'OUT' && m.type !== 'TRANSFER_OUT') continue;
    const key = m.itemId;
    if (!consumption[key]) {
      consumption[key] = {
        itemCode: m.item.code, itemName: m.item.name, unit: m.item.unitObj?.name || '',
        quantity: 0, value: 0,
      };
    }
    consumption[key].quantity += Number(m.quantity);
    consumption[key].value += Number(m.totalCost);
  }

  return {
    receiptCount: receipts.length,
    issueCount: issues.length,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    consumption: Object.values(consumption)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 30),
  };
}

export async function fixedAssetsSummary(prisma: PrismaService, projectId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: { projectId },
  });
  const totalCost = assets.reduce((s, a) => s + Number(a.acquisitionCost), 0);
  const totalDeprec = assets.reduce((s, a) => s + Number(a.accumulatedDepreciation), 0);
  const totalBook = assets.reduce((s, a) => s + Number(a.bookValue), 0);

  return {
    count: assets.length,
    totalCost: Math.round(totalCost * 100) / 100,
    totalDeprec: Math.round(totalDeprec * 100) / 100,
    totalBookValue: Math.round(totalBook * 100) / 100,
    items: assets.slice(0, 30).map((a) => ({
      code: a.code, name: a.name,
      acquisitionCost: Number(a.acquisitionCost),
      accumulatedDepreciation: Number(a.accumulatedDepreciation),
      bookValue: Number(a.bookValue),
      status: a.status,
    })),
  };
}

export async function payrollSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const periods = await prisma.payrollPeriod.findMany({
    where: { projectId, startDate: { gte: from }, endDate: { lte: to } },
    include: { _count: { select: { records: true } } },
  });
  return {
    periodCount: periods.length,
    totalGross: periods.reduce((s, p) => s + Number(p.totalGross), 0),
    totalNet: periods.reduce((s, p) => s + Number(p.totalNet), 0),
    items: periods.map((p) => ({
      code: p.code, title: p.title, status: p.status,
      year: p.year, month: p.month,
      totalGross: Number(p.totalGross), totalNet: Number(p.totalNet),
      recordCount: p._count.records,
    })),
  };
}

export async function equipmentSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const logs = await prisma.equipmentDailyLog.findMany({
    where: { projectId, logDate: { gte: from, lte: to } },
    include: { equipment: { select: { code: true, name: true, ownership: true } } },
  });
  const totalCost = logs.reduce((s, l) => s + Number(l.computedCost), 0);
  const totalHours = logs.reduce((s, l) => s + Number(l.workHours), 0);
  return {
    logCount: logs.length,
    totalHours: Math.round(totalHours * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    items: logs.slice(0, 30).map((l) => ({
      equipmentCode: l.equipment.code, equipmentName: l.equipment.name,
      logDate: l.logDate, workHours: Number(l.workHours),
      fuelLiters: Number(l.fuelLiters), computedCost: Number(l.computedCost),
    })),
  };
}

export async function siteOpsSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const reports = await prisma.dailyReport.findMany({
    where: { projectId, reportDate: { gte: from, lte: to } },
    orderBy: { reportDate: 'desc' },
    take: 60,
  });
  return {
    reportCount: reports.length,
    items: reports.map((r) => ({
      code: r.code, reportDate: r.reportDate, status: r.status,
      weather: r.weather,
    })),
  };
}
