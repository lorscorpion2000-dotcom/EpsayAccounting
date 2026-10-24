import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SiteOpsService } from '../site-ops/site-ops.service';
import { SubcontractorStatementsService } from '../payroll/subcontractor-statements.service';
import { WorkerStatementsService } from '../payroll/worker-statements.service';
import { ClientStatementService } from '../client-statement/client-statement.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private siteOps: SiteOpsService,
    private subcontractorStatements: SubcontractorStatementsService,
    private workerStatements: WorkerStatementsService,
    private clientStatements: ClientStatementService,
    private expenses: ExpensesService,
  ) {}

  /**
   * چک می‌کند که کاربر مجاز به تأیید گزارش‌های دیگران است یا نه
   * (admin / super_admin / approver با permission approvals.update)
   */
  private async canUserApprove(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return false;
    const roleCodes = new Set<string>();
    const permCodes = new Set<string>();
    for (const ur of user.roles || []) {
      if (ur.role?.code) roleCodes.add(ur.role.code);
      for (const rp of ur.role?.permissions || []) {
        if (rp.permission?.code) permCodes.add(rp.permission.code);
      }
    }
    if (roleCodes.has('admin') || roleCodes.has('super_admin')) return true;
    if (permCodes.has('approvals.update')) return true;
    if (permCodes.has('approvals.approve')) return true;
    return false;
  }

  private static readonly MODULE_ROLES: Record<string, string[]> = {
    pettyCashTransactions:   ['financial_manager', 'accountant', 'petty_cash_holder'],
    pettyCashRequests:       ['financial_manager', 'accountant'],
    purchaseRequests:        ['project_manager', 'procurement_officer', 'financial_manager'],
    purchaseOrders:          ['procurement_officer', 'financial_manager', 'project_manager'],
    dailyReports:            ['project_manager', 'site_supervisor'],
    goodsReceipts:           ['warehouse_keeper', 'procurement_officer', 'accountant'],
    subcontractorStatements: ['project_manager', 'financial_manager', 'accountant'],
    leaveRequests:           ['project_manager', 'hr'],
    advanceRequests:         ['financial_manager', 'project_manager'],
    clientStatements:        ['financial_manager', 'accountant', 'project_manager'],
    workerStatements:        ['project_manager', 'financial_manager', 'accountant'],
    expenses:                ['financial_manager', 'accountant', 'project_manager'],
  };

  private async getModuleAccess(userId?: string): Promise<{
    all: boolean;
    roleCodes: Set<string>;
    access: Record<string, boolean>;
  }> {
    if (!userId) return { all: true, roleCodes: new Set(), access: {} };
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user) return { all: false, roleCodes: new Set(), access: {} };
    const roleCodes = new Set<string>();
    for (const ur of user.roles || []) {
      if (ur.role?.code) roleCodes.add(ur.role.code);
    }
    const isSuper = roleCodes.has('super_admin') || roleCodes.has('admin');
    if (isSuper) return { all: true, roleCodes, access: {} };
    const access: Record<string, boolean> = {};
    for (const [mod, allowed] of Object.entries(ApprovalsService.MODULE_ROLES)) {
      access[mod] = allowed.some((r) => roleCodes.has(r));
    }
    return { all: false, roleCodes, access };
  }

  async getPending(userId?: string) {
    const canApprove = userId ? await this.canUserApprove(userId) : true;
    const access = await this.getModuleAccess(userId);
    const can = (mod: string): boolean => access.all || !!access.access?.[mod];
    let [
      pettyCashTxs,
      pettyCashRequests,
      purchaseReqs,
      purchaseOrders,
      dailyReports,
      goodsReceipts,
      subcontractorStatements,
      leaveRequests,
      advanceRequests,
      clientStatementsPending,
      workerStatementsPending,
      expensesPending,
    ] = await Promise.all([
      this.prisma.pettyCashTransaction.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          account: {
            select: {
              id: true, code: true, name: true,
              holder: { select: { id: true, fullName: true } },
            },
          },
          project: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.pettyCashRequest.findMany({
        where: { status: { in: ['PENDING', 'APPROVED'] } },
        include: {
          account: {
            select: {
              id: true, code: true, name: true,
              holder: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.purchaseRequest.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          requester: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.purchaseOrder.findMany({
        where: { status: 'DRAFT' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.dailyReport.findMany({
        where: userId
          ? canApprove
            ? {
                OR: [
                  { status: 'SUBMITTED' },
                  { status: 'REJECTED', createdById: userId },
                ],
              }
            : {
                createdById: userId,
                status: { in: ['SUBMITTED', 'REJECTED'] },
              }
          : { status: 'SUBMITTED' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { workers: true, equipments: true, materials: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.goodsReceipt.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.subcontractorStatement.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          contractor: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          employee: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.advanceRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          employee: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.clientStatement.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.workerStatement.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          partner: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.expense.findMany({
        where: { status: 'SUBMITTED', deletedAt: null },
        include: {
          category: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!access.all) {


      if (!can('pettyCashTransactions'))   pettyCashTxs = [];


      if (!can('pettyCashRequests'))       pettyCashRequests = [];


      if (!can('purchaseRequests'))        purchaseReqs = [];


      if (!can('purchaseOrders'))          purchaseOrders = [];


      if (!can('dailyReports'))            dailyReports = [];


      if (!can('goodsReceipts'))           goodsReceipts = [];


      if (!can('subcontractorStatements')) subcontractorStatements = [];


      if (!can('leaveRequests'))           leaveRequests = [];


      if (!can('advanceRequests'))         advanceRequests = [];


      if (!can('clientStatements'))        clientStatementsPending = [];


      if (!can('workerStatements'))        workerStatementsPending = [];


      if (!can('expenses'))                expensesPending = [];


    }


    return {
      _meta: {
        roleCodes: Array.from(access.roleCodes),
        modulesAllowed: access.all
          ? Object.keys(ApprovalsService.MODULE_ROLES)
          : Object.entries(access.access || {}).filter(([, v]) => v).map(([k]) => k),
      },
      pettyCashTransactions: pettyCashTxs.map((tx) => ({
        id: tx.id,
        module: 'petty-cash-transaction',
        type: 'EXPENSE',
        code: tx.code,
        title: `تراکنش تنخواه ${tx.type === 'EXPENSE' ? 'هزینه' : 'شارژ'}`,
        description: tx.description,
        amount: tx.amount,
        date: tx.txDate,
        status: tx.status,
        requester: tx.account?.holder?.fullName || '—',
        accountName: tx.account?.name,
        accountCode: tx.account?.code,
        projectName: tx.project?.name || null,
        recipient: tx.recipient,
        category: tx.category,
        invoiceNumber: tx.invoiceNumber,
        createdAt: tx.createdAt,
        raw: tx,
      })),

      pettyCashRequests: pettyCashRequests.map((req) => ({
        id: req.id,
        module: 'petty-cash-request',
        type: 'FUNDING',
        code: req.code,
        title: 'درخواست شارژ تنخواه',
        description: req.reason,
        amount: req.amount,
        date: req.requestDate,
        status: req.status,
        requester: req.account?.holder?.fullName || '—',
        accountName: req.account?.name,
        accountCode: req.account?.code,
        currentBalance: req.currentBalance,
        iban: req.iban,
        createdAt: req.createdAt,
        raw: req,
      })),

      purchaseRequests: purchaseReqs.map((pr) => ({
        id: pr.id,
        module: 'purchase-request',
        type: 'PURCHASE',
        code: pr.code,
        title: 'درخواست خرید',
        description: pr.reason || `${pr._count?.items || 0} قلم کالا/خدمت`,
        amount: 0,
        date: pr.requestDate,
        status: pr.status,
        requester: pr.requester?.fullName || '—',
        projectName: pr.project?.name || null,
        projectCode: pr.project?.code,
        itemCount: pr._count?.items || 0,
        department: pr.department,
        deliveryLocation: pr.deliveryLocation,
        createdAt: pr.createdAt,
        raw: pr,
      })),

      purchaseOrders: purchaseOrders.map((po) => ({
        id: po.id,
        module: 'purchase-order',
        type: 'PO',
        code: po.code,
        title: 'دستور خرید',
        description: `${po._count?.items || 0} قلم - تأمین‌کننده: ${po.supplier?.name || '—'}`,
        amount: po.totalAmount,
        date: po.poDate,
        status: po.status,
        requester: 'سیستم',
        supplierName: po.supplier?.name,
        projectName: po.project?.name || null,
        projectCode: po.project?.code,
        itemCount: po._count?.items || 0,
        createdAt: po.createdAt,
        raw: po,
      })),

      dailyReports: dailyReports.map((dr) => ({
        id: dr.id,
        module: 'daily-report',
        type: 'SITE_OPS',
        code: dr.code,
        title: 'گزارش روزانه کارگاه',
        description: dr.operations
          ? dr.operations.slice(0, 120)
          : `${dr._count?.workers || 0} اکیپ، ${dr._count?.equipments || 0} ماشین`,
        amount: 0,
        date: dr.reportDate,
        status: dr.status,
        requester: dr.createdBy?.fullName || '—',
        projectName: dr.project?.name || null,
        projectCode: dr.project?.code,
        itemCount: (dr._count?.workers || 0) + (dr._count?.equipments || 0) + (dr._count?.materials || 0),
        createdAt: dr.createdAt,
        raw: dr,
      })),

      goodsReceipts: goodsReceipts.map((gr) => ({
        id: gr.id,
        module: 'goods-receipt',
        type: 'RECEIPT',
        code: gr.code,
        title: 'رسید انبار',
        description: `${gr._count?.items || 0} قلم - انبار: ${gr.warehouse?.name || '—'}`,
        amount: gr.totalValue,
        date: gr.receiptDate,
        status: gr.status,
        requester: gr.createdBy?.fullName || '—',
        supplierName: gr.supplier?.name,
        projectName: gr.project?.name || null,
        projectCode: gr.project?.code,
        warehouseName: gr.warehouse?.name,
        itemCount: gr._count?.items || 0,
        createdAt: gr.createdAt,
        raw: gr,
      })),

      subcontractorStatements: subcontractorStatements.map((s) => ({
        id: s.id,
        module: 'subcontractor-statement',
        type: 'STATEMENT',
        code: s.code,
        title: `صورت‌وضعیت شماره ${s.statementNumber}`,
        description: `پیمانکار: ${s.contractor?.name || '—'} - ${s._count?.items || 0} قلم`,
        amount: s.netPayable,
        date: s.periodEnd,
        status: s.status,
        requester: s.contractor?.name || '—',
        projectName: s.project?.name || null,
        projectCode: s.project?.code,
        supplierName: s.contractor?.name,
        itemCount: s._count?.items || 0,
        createdAt: s.createdAt,
        raw: s,
      })),

      leaveRequests: leaveRequests.map((lr) => ({
        id: lr.id,
        module: 'leave-request',
        type: 'LEAVE',
        code: lr.code,
        title: 'درخواست مرخصی',
        description: `${lr.leaveType} - ${lr.days} روز`,
        amount: 0,
        date: lr.startDate,
        status: lr.status,
        requester: lr.employee?.name || '—',
        employeeName: lr.employee?.name,
        leaveType: lr.leaveType,
        days: lr.days,
        createdAt: lr.createdAt,
        raw: lr,
      })),

      advanceRequests: advanceRequests.map((ar) => ({
        id: ar.id,
        module: 'advance-request',
        type: 'ADVANCE',
        code: ar.code,
        title: 'درخواست مساعده',
        description: ar.reason || 'درخواست مساعده از حقوق',
        amount: ar.amount,
        date: ar.requestDate,
        status: ar.status,
        requester: ar.employee?.name || '—',
        employeeName: ar.employee?.name,
        createdAt: ar.createdAt,
        raw: ar,
      })),

      clientStatements: clientStatementsPending.map((s) => ({
        id: s.id,
        module: 'client-statement',
        type: 'STATEMENT',
        code: s.code,
        title: 'صورت‌وضعیت کارفرما ' + s.statementNumber,
        description: 'پروژه: ' + (s.project?.name || '—') + ' - ' + (s._count?.items || 0) + ' ردیف',
        amount: s.netPayable,
        date: s.periodEnd,
        status: s.status,
        requester: 'کارفرما',
        projectName: s.project?.name || null,
        projectCode: s.project?.code,
        itemCount: s._count?.items || 0,
        createdAt: s.createdAt,
        raw: s,
      })),

      workerStatements: workerStatementsPending.map((s) => ({
        id: s.id,
        module: 'worker-statement',
        type: 'STATEMENT',
        code: s.code,
        title: 'صورت‌وضعیت پرسنل ' + s.statementNumber,
        description: 'پرسنل: ' + (s.partner?.name || '—') + ' - ' + (s._count?.items || 0) + ' ردیف',
        amount: s.netPayable,
        date: s.periodEnd,
        status: s.status,
        requester: s.partner?.name || '—',
        employeeName: s.partner?.name,
        projectName: s.project?.name || null,
        projectCode: s.project?.code,
        itemCount: s._count?.items || 0,
        createdAt: s.createdAt,
        raw: s,
      })),

      expenses: expensesPending.map((e) => ({
        id: e.id,
        module: 'expense',
        type: 'EXPENSE',
        code: e.code,
        title: 'هزینه ' + (e.category?.name || ''),
        description: (e.description || '').slice(0, 120),
        amount: Number(e.totalAmount),
        date: e.expenseDate,
        status: e.status,
        requester: e.supplier?.name || '—',
        supplierName: e.supplier?.name || null,
        projectName: e.project?.name || null,
        projectCode: e.project?.code,
        categoryName: e.category?.name || null,
        createdAt: e.createdAt,
        raw: e,
      })),
    };
  }

  async getStats() {
    const [
      pettyCashTxCount,
      pettyCashReqCount,
      purchaseReqCount,
      purchaseOrderCount,
      dailyReportCount,
      goodsReceiptCount,
      subcontractorStatementCount,
      leaveRequestCount,
      advanceRequestCount,
      clientStatementCount,
      workerStatementCount,
      expenseCount,
      pettyCashTxAmount,
      pettyCashReqAmount,
      purchaseOrderAmount,
    ] = await Promise.all([
      this.prisma.pettyCashTransaction.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.pettyCashRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.purchaseRequest.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      this.prisma.dailyReport.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.goodsReceipt.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.subcontractorStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.advanceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.clientStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.workerStatement.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.expense.count({ where: { status: 'SUBMITTED', deletedAt: null } }),
      this.prisma.pettyCashTransaction.aggregate({
        where: { status: 'SUBMITTED' },
        _sum: { amount: true },
      }),
      this.prisma.pettyCashRequest.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: { status: 'DRAFT' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total:
        pettyCashTxCount +
        pettyCashReqCount +
        purchaseReqCount +
        purchaseOrderCount +
        dailyReportCount +
        goodsReceiptCount +
        subcontractorStatementCount +
        leaveRequestCount +
        advanceRequestCount,
      byModule: {
        pettyCashTransactions: {
          count: pettyCashTxCount,
          amount: Number(pettyCashTxAmount._sum.amount || 0),
        },
        pettyCashRequests: {
          count: pettyCashReqCount,
          amount: Number(pettyCashReqAmount._sum.amount || 0),
        },
        purchaseRequests: {
          count: purchaseReqCount,
          amount: 0,
        },
        purchaseOrders: {
          count: purchaseOrderCount,
          amount: Number(purchaseOrderAmount._sum.totalAmount || 0),
        },
        dailyReports: {
          count: dailyReportCount,
          amount: 0,
        },
        goodsReceipts: {
          count: goodsReceiptCount,
          amount: 0,
        },
        subcontractorStatements: {
          count: subcontractorStatementCount,
          amount: 0,
        },
        leaveRequests: {
          count: leaveRequestCount,
          amount: 0,
        },
        advanceRequests: {
          count: advanceRequestCount,
          amount: 0,
        },

        clientStatements: {
          count: clientStatementCount,
          amount: 0,
        },
        workerStatements: {
          count: workerStatementCount,
          amount: 0,
        },

        expenses: {
          count: expenseCount,
          amount: 0,
        },
      },
    };
  }

  async approve(module: string, id: string, userId: string, force?: boolean) {
    switch (module) {
      case 'petty-cash-transaction':
        return this.prisma.pettyCashTransaction.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });

      case 'petty-cash-request':
        return this.prisma.pettyCashRequest.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });

      case 'purchase-request':
        return this.approvePurchaseRequest(id, userId);

      case 'purchase-order':
        return this.approvePurchaseOrderWithBudgetCheck(id, userId, force);

      case 'daily-report':
        // B13: delegate to site-ops (section check + self-approve check)
        return this.siteOps.approve(id, userId);

      case 'goods-receipt':
        return this.prisma.goodsReceipt.update({
          where: { id },
          data: { status: 'APPROVED' },
        });

      case 'subcontractor-statement':
        // F13: delegate to service (builds JE)
        return this.subcontractorStatements.approve(id, userId);

      case 'client-statement':
        // F13: delegate to service (approve + JE)
        return this.clientStatements.approve(id, userId);

      case 'worker-statement':
        // F13: delegate to service (approve + JE)
        return this.workerStatements.approve(id, userId);      case 'expense':
        return this.expenses.approve(id, userId);



      case 'leave-request':
        return this.prisma.leaveRequest.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });

      case 'advance-request':
        return this.prisma.advanceRequest.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        });

      default:
        throw new Error('ماژول نامعتبر: ' + module);
    }
  }

  async reject(module: string, id: string, reason: string, userId: string) {
    switch (module) {
      case 'petty-cash-transaction':
        return this.prisma.pettyCashTransaction.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectedReason: reason,
            rejectedById: userId,
            rejectedAt: new Date(),
          },
        });

      case 'petty-cash-request': {
        const req = await this.prisma.pettyCashRequest.findUnique({ where: { id } });
        return this.prisma.pettyCashRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            reason: (req?.reason || '') + ' | دلیل رد: ' + reason,
          },
        });
      }

      case 'purchase-request':
        return this.prisma.purchaseRequest.update({
          where: { id },
          data: { status: 'REJECTED', rejectedReason: reason },
        });

      case 'purchase-order':
        return this.prisma.purchaseOrder.update({
          where: { id },
          data: { status: 'CANCELLED', notes: 'رد شده: ' + reason },
        });

      case 'daily-report':
        // B13: delegate to site-ops (unified REJECTED)
        return this.siteOps.reject(id, reason);

      case 'goods-receipt':
        return this.prisma.goodsReceipt.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

      case 'subcontractor-statement':
        // F13: delegate to service
        return this.subcontractorStatements.reject(id, reason);

      case 'client-statement':
        return this.clientStatements.reject(id, reason);

      case 'worker-statement':
        return this.workerStatements.reject(id, reason);

      case 'expense':
        return this.expenses.reject(id, reason, userId);

      default:
        throw new Error('ماژول نامعتبر: ' + module);
    }
  }

  private async approvePurchaseRequest(prId: string, userId: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: prId },
      include: { items: true, purchaseOrders: true },
    });
    if (!pr) throw new NotFoundException('درخواست خرید پیدا نشد');

    if (pr.purchaseOrders && pr.purchaseOrders.length > 0) {
      return this.prisma.purchaseRequest.update({
        where: { id: prId },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
    }

    // کارپرداز
    let assignedToId: string | null = null;
    const purchaserRole = await this.prisma.role.findFirst({
      where: { code: 'purchaser' },
      include: { users: true },
    });
    if (purchaserRole && purchaserRole.users.length > 0) {
      assignedToId = purchaserRole.users[0].userId;
    }

    // کد PO
    const year = new Date().getFullYear();
    const prefix = 'PO-' + year + '-';
    const lastPo = await this.prisma.purchaseOrder.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = lastPo ? parseInt(lastPo.code.slice(prefix.length), 10) : 0;
    const code = prefix + String(lastNum + 1).padStart(4, '0');

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          code,
          prId: pr.id,
          projectId: pr.projectId,
          supplierId: null,
          poDate: new Date(),
          status: 'DRAFT',
          notes: 'تبدیل خودکار از درخواست خرید ' + pr.code,
          assignedToId,
          assignedAt: new Date(),
          createdById: userId,
          items: {
            create: pr.items.map((it) => ({
              rowNumber: it.rowNumber,
              description: it.description,
              quantity: it.quantity,
              unit: '', // Phase C: legacy text unit removed
              unitPrice: 0,
              totalPrice: 0,
              notes: it.notes,
            })),
          },
        },
      });

      await tx.purchaseRequest.update({
        where: { id: prId },
        data: {
          status: 'ORDERED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      return po;
    });
  }

  // ============================================================
  // C-5: Budget control for Purchase Order approval
  // ============================================================
  private async approvePurchaseOrderWithBudgetCheck(
    poId: string,
    _userId: string,
    force?: boolean,
  ) {
    const check = await this.checkBudgetForPurchaseOrder(poId);
    if (check && check.exceeded && !force) {
      throw new BadRequestException({
        code: 'BUDGET_EXCEEDED',
        message: 'Budget threshold exceeded. Send force=true to approve anyway.',
        detail: check,
      });
    }
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'APPROVED' },
    });
  }

  // C-5: Compute budget status for a PO based on its PR's WBS item
  async checkBudgetForPurchaseOrder(poId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { pr: { select: { wbsItemId: true } } },
    });
    if (!po) throw new NotFoundException('PO not found');
    if (!po.pr?.wbsItemId) return null;

    const wbsItemId = po.pr.wbsItemId;

    const budgetAgg = await this.prisma.projectBudget.aggregate({
      where: { wbsItemId, projectId: po.projectId },
      _sum: { amount: true },
    });
    const budget = Number(budgetAgg._sum.amount || 0);
    if (budget <= 0) return null;

    const committedAgg = await this.prisma.purchaseOrder.aggregate({
      where: {
        status: 'APPROVED',
        id: { not: poId },
        pr: { wbsItemId },
      },
      _sum: { totalAmount: true },
    });
    const committed = Number(committedAgg._sum.totalAmount || 0);

    const actualAgg = await this.prisma.purchaseInvoiceItem.aggregate({
      where: {
        wbsItemId,
        invoice: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
      },
      _sum: { totalPrice: true },
    });
    const actual = Number(actualAgg._sum.totalPrice || 0);

    const currentPO = Number(po.totalAmount);
    const projectedTotal = committed + actual + currentPO;
    const thresholdPercent = 10;
    const threshold = budget * (1 + thresholdPercent / 100);
    const exceeded = projectedTotal > threshold;

    return {
      wbsItemId,
      budget,
      committed,
      actual,
      currentPO,
      projectedTotal,
      threshold,
      thresholdPercent,
      exceeded,
      overBudget: exceeded ? projectedTotal - budget : 0,
    };
  }
}
