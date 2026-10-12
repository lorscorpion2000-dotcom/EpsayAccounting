import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { accountingSummary, budgetVsActual } from './helpers/accounting-summary';
import {
  warehouseSummary, fixedAssetsSummary, payrollSummary,
  equipmentSummary, siteOpsSummary,
} from './helpers/ops-summary';
import {
  workerStatementsSummary, subcontractorStatementsSummary,
  clientStatementsSummary, contractsSummary,
} from './helpers/commercial-summary';
import {
  kpiSummary, cashFlowSummary, costByCategorySummary,
  agingSummary, progressVsCostSummary,
} from './helpers/analytics-summary';

/**
 * گزارشات جامع پروژه — همه‌ی گروه‌ها در یک پاسخ
 * (منطق هر گروه در helpers/* جدا شده — F8c)
 */
@Injectable()
export class ProjectReportsService {
  constructor(private prisma: PrismaService) {}

  async getAll(projectId: string, fromISO?: string, toISO?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, code: true, name: true } },
        consultant: { select: { id: true, code: true, name: true } },
      },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const now = new Date();
    const from = fromISO ? new Date(fromISO) : new Date(now.getFullYear(), 0, 1);
    const to = toISO ? new Date(toISO) : now;

    const [
      accounting, budget, warehouse, fixedAssets,
      workerStatements, subcontractorStatements, clientStatements,
      contracts, payroll, equipment, siteOps, kpi,
      cashFlow, costByCategory, aging, progressVsCost,
    ] = await Promise.all([
      accountingSummary(this.prisma, projectId, from, to),
      budgetVsActual(this.prisma, projectId, from, to),
      warehouseSummary(this.prisma, projectId, from, to),
      fixedAssetsSummary(this.prisma, projectId),
      workerStatementsSummary(this.prisma, projectId, from, to),
      subcontractorStatementsSummary(this.prisma, projectId, from, to),
      clientStatementsSummary(this.prisma, projectId, from, to),
      contractsSummary(this.prisma, projectId),
      payrollSummary(this.prisma, projectId, from, to),
      equipmentSummary(this.prisma, projectId, from, to),
      siteOpsSummary(this.prisma, projectId, from, to),
      kpiSummary(this.prisma, projectId, from, to),
      cashFlowSummary(this.prisma, projectId, from, to),
      costByCategorySummary(this.prisma, projectId, from, to),
      agingSummary(this.prisma, projectId),
      progressVsCostSummary(this.prisma, projectId),
    ]);

    return {
      project: {
        id: project.id, code: project.code, name: project.name,
        status: project.status, type: project.type,
        client: project.client, consultant: project.consultant,
        totalArea: project.totalArea ? Number(project.totalArea) : null,
        startDate: project.startDate, plannedEndDate: project.plannedEndDate,
      },
      period: { from: from.toISOString(), to: to.toISOString() },
      accounting,
      budget,
      warehouse,
      fixedAssets,
      workerStatements,
      subcontractorStatements,
      clientStatements,
      contracts,
      payroll,
      equipment,
      siteOps,
      kpi,
      cashFlow,
      costByCategory,
      aging,
      progressVsCost,
    };
  }
}
