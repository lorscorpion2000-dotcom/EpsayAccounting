import type { PrismaService } from '../../../../shared/prisma/prisma.service';

export async function workerStatementsSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const list = await prisma.workerStatement.findMany({
    where: {
      projectId,
      periodStart: { gte: from },
      periodEnd: { lte: to },
    },
    include: { partner: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const totalEarnings = list.reduce((s, w) => s + Number(w.totalEarnings), 0);
  const totalNet = list.reduce((s, w) => s + Number(w.netPayable), 0);
  return {
    count: list.length,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    items: list.map((w) => ({
      code: w.code, status: w.status,
      partnerName: w.partner.name, partnerCode: w.partner.code,
      periodStart: w.periodStart, periodEnd: w.periodEnd,
      totalEarnings: Number(w.totalEarnings),
      netPayable: Number(w.netPayable),
    })),
  };
}

export async function subcontractorStatementsSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const list = await prisma.subcontractorStatement.findMany({
    where: {
      projectId,
      periodStart: { gte: from },
      periodEnd: { lte: to },
    },
    include: { contractor: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const totalAmount = list.reduce((s, x) => s + Number(x.totalAmount), 0);
  const totalNet = list.reduce((s, x) => s + Number(x.netPayable), 0);
  return {
    count: list.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    items: list.map((x) => ({
      code: x.code, status: x.status,
      contractorName: x.contractor.name, contractorCode: x.contractor.code,
      statementNumber: x.statementNumber,
      periodStart: x.periodStart, periodEnd: x.periodEnd,
      totalAmount: Number(x.totalAmount), netPayable: Number(x.netPayable),
    })),
  };
}

export async function clientStatementsSummary(prisma: PrismaService, projectId: string, from: Date, to: Date) {
  const list = await prisma.clientStatement.findMany({
    where: { projectId, periodStart: { gte: from }, periodEnd: { lte: to } },
    orderBy: { createdAt: 'desc' },
  });
  const total = list.reduce((s, x) => s + Number(x.netPayable), 0);
  return {
    count: list.length,
    totalNet: Math.round(total * 100) / 100,
    items: list.map((x) => ({
      code: x.code, status: x.status,
      statementNumber: x.statementNumber,
      periodStart: x.periodStart, periodEnd: x.periodEnd,
      totalBefore: Number(x.totalBeforeCoefficient),
      netPayable: Number(x.netPayable),
    })),
  };
}

export async function contractsSummary(prisma: PrismaService, projectId: string) {
  const [proj, legal] = await Promise.all([
    prisma.contract.findMany({ where: { projectId } }),
    prisma.legalContract.findMany({ where: { projectId } }),
  ]);
  return {
    projectContracts: {
      count: proj.length,
      totalBase: proj.reduce((s, c) => s + Number(c.baseAmount), 0),
      items: proj.map((c) => ({
        code: c.code, type: c.type, status: c.status,
        baseAmount: Number(c.baseAmount), coefficient: Number(c.coefficient),
      })),
    },
    legalContracts: {
      count: legal.length,
      total: legal.reduce((s, c) => s + Number(c.totalAmount || 0), 0),
      items: legal.map((c) => ({
        code: c.code, kind: c.kind, status: c.status, title: c.title,
        totalAmount: Number(c.totalAmount || 0),
      })),
    },
  };
}
