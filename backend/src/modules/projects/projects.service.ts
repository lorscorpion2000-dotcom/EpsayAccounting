import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.project.count();
    return 'PRJ-' + year + '-' + String(count + 1).padStart(3, '0');
  }

  async findAll(query?: { status?: string; search?: string }) {
    const where: any = { isActive: true };
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        consultant: { select: { id: true, name: true } },
        _count: { select: { contracts: true, wbsItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        consultant: true,
        contracts: { orderBy: { createdAt: 'desc' } },
        _count: { select: { wbsItems: true, budgets: true } },
      },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');
    return project;
  }

  async create(dto: CreateProjectDto) {
    const code = await this.generateCode();
    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        status: dto.status,
        usage: dto.usage,
        clientId: dto.clientId,
        consultantId: dto.consultantId,
        purchasingOfficerId: dto.purchasingOfficerId || null,
        addressProvince: dto.addressProvince,
        addressCity: dto.addressCity,
        addressFull: dto.addressFull,
        totalArea: dto.totalArea,
        floorsCount: dto.floorsCount,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { client: true, consultant: true },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
      },
      include: { client: true, consultant: true },
    });
  }

  async remove(id: string, options?: { force?: boolean }) {
    await this.findOne(id);
    const force = options?.force === true;

    if (!force) {
      await this.prisma.project.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, softDeleted: true };
    }

    const refs = await this.countReferences(id);
    const total = Object.values(refs).reduce((s: number, n: any) => s + Number(n || 0), 0);

    if (total > 0) {
      const details = Object.entries(refs)
        .filter(([, v]: any) => Number(v) > 0)
        .map(([k, v]) => '  - ' + k + ': ' + v)
        .join('\n');
      throw new BadRequestException({
        code: 'PROJECT_HAS_REFS',
        message: '\u067e\u0631\u0648\u0698\u0647 \u062f\u0631 ' + total + ' \u0645\u0648\u0631\u062f \u062f\u06cc\u06af\u0631 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u062f\u0647. \u0627\u0628\u062a\u062f\u0627 \u0622\u0646\u200c\u0647\u0627 \u0631\u0627 \u067e\u0627\u06a9 \u06a9\u0646\u06cc\u062f \u06cc\u0627 \u0627\u0632 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u06a9\u0646\u06cc\u062f:\n' + details,
        refs, total,
      });
    }

    await this.prisma.project.delete({ where: { id } });
    return { success: true, hardDeleted: true };
  }

  private async countReferences(id: string) {
    const p = this.prisma;
    const r = await Promise.all([
      p.contract.count({ where: { projectId: id } }),
      p.wbsItem.count({ where: { projectId: id } }),
      p.projectBudget.count({ where: { projectId: id } }),
      p.pettyCashAccount.count({ where: { projectId: id } }).catch(() => 0),
      p.pettyCashTransaction.count({ where: { projectId: id } }).catch(() => 0),
      p.purchaseRequest.count({ where: { projectId: id } }),
      p.purchaseOrder.count({ where: { projectId: id } }),
      p.goodsReceipt.count({ where: { projectId: id } }),
      p.goodsIssue.count({ where: { projectId: id } }),
      p.dailyReport.count({ where: { projectId: id } }),
      p.payrollPeriod.count({ where: { projectId: id } }).catch(() => 0),
      p.subcontractorStatement.count({ where: { projectId: id } }),
      p.projectPartnerShare.count({ where: { projectId: id } }),
      p.partnerCapitalAccount.count({ where: { projectId: id } }).catch(() => 0),
      p.permit.count({ where: { projectId: id } }).catch(() => 0),
      p.insurance.count({ where: { projectId: id } }).catch(() => 0),
      p.guarantee.count({ where: { projectId: id } }).catch(() => 0),
      p.technicalDocument.count({ where: { projectId: id } }).catch(() => 0),
      p.phaseChecklist.count({ where: { projectId: id } }).catch(() => 0),
      p.legalContract.count({ where: { projectId: id } }).catch(() => 0),
      p.salesUnit.count({ where: { projectId: id } }).catch(() => 0),
      p.journalLine.count({ where: { projectId: id } }).catch(() => 0),
      p.costCenter.count({ where: { projectId: id } }).catch(() => 0),
      p.cheque.count({ where: { projectId: id } }).catch(() => 0),
      p.fixedAsset.count({ where: { projectId: id } }).catch(() => 0),
      p.purchaseInvoice.count({ where: { projectId: id } }).catch(() => 0),
      p.salesInvoice.count({ where: { projectId: id } }).catch(() => 0),
      p.equipment.count({ where: { currentProjectId: id } }).catch(() => 0),
      p.equipmentDailyLog.count({ where: { projectId: id } }).catch(() => 0),
      p.overheadAllocationItem.count({ where: { projectId: id } }).catch(() => 0),
      p.clientStatement.count({ where: { projectId: id } }).catch(() => 0),
      p.workerStatement.count({ where: { projectId: id } }).catch(() => 0),
      p.wbsProgressSnapshot.count({ where: { projectId: id } }).catch(() => 0),
      p.adjustmentCalculation.count({ where: { projectId: id } }).catch(() => 0),
      p.materialPriceDiff.count({ where: { projectId: id } }).catch(() => 0),
    ]);
    const keys = [
      'contracts','wbsItems','budgets','pettyCashAccounts','pettyCashTransactions',
      'purchaseRequests','purchaseOrders','goodsReceipts','goodsIssues','dailyReports',
      'payrollPeriods','subcontractorStatements','projectPartnerShares','capitalAccounts',
      'permits','insurances','guarantees','technicalDocuments','phaseChecklists','legalContracts',
      'salesUnits','journalLines','costCenters','cheques','fixedAssets',
      'purchaseInvoices','salesInvoices','equipment','equipmentDailyLogs','overheadAllocations',
      'clientStatements','workerStatements','wbsProgressSnapshots','adjustmentCalculations','materialPriceDiffs',
    ];
    const out: Record<string, number> = {};
    keys.forEach((k, i) => { out[k] = Number(r[i] || 0); });
    return out;
  }
}
