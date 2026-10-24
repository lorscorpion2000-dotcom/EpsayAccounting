import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class TaxReportsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // 1) گزارش ارزش افزوده (VAT)
  // ═══════════════════════════════════════════════════════════
  async vatReport(params: { fromDate: string; toDate: string; projectId?: string; partnerId?: string }) {
    const baseFilter: { projectId?: string } = params.projectId ? { projectId: params.projectId } : {};

    const dateFilter = {
      gte: new Date(params.fromDate),
      lte: new Date(params.toDate),
    };

    // ─── خرید (ارزش افزوده ورودی) ───
    const purchaseWhere: Prisma.PurchaseInvoiceWhereInput = {
      ...baseFilter,
      invoiceDate: dateFilter,
      status: { in: ['APPROVED', 'PARTIALLY_PAID', 'PAID'] },
      deletedAt: null,
    };
    if (params.partnerId) purchaseWhere.supplierId = params.partnerId;

    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: purchaseWhere,
      include: {
        supplier: { select: { id: true, code: true, name: true, nationalId: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // ─── فروش (ارزش افزوده خروجی) ───
    const salesWhere: Prisma.SalesInvoiceWhereInput = {
      ...baseFilter,
      invoiceDate: dateFilter,
      status: { in: ['APPROVED', 'PARTIALLY_RECEIVED', 'PAID'] },
      deletedAt: null,
    };
    if (params.partnerId) salesWhere.partnerId = params.partnerId;

    const sales = await this.prisma.salesInvoice.findMany({
      where: salesWhere,
      include: {
        partner: { select: { id: true, code: true, name: true, nationalId: true } },
        project: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, fullName: true, nationalId: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // ─── محاسبات ───
    const inputVAT = purchases.reduce((s, p) => s + Number(p.taxAmount || 0), 0);
    const outputVAT = sales.reduce((s, p) => s + Number(p.taxAmount || 0), 0);
    const netVAT = outputVAT - inputVAT;

    const purchaseRows = purchases.map((p) => ({
      id: p.id,
      type: 'PURCHASE',
      code: p.code,
      invoiceNumber: p.invoiceNumber,
      invoiceDate: p.invoiceDate,
      partyName: p.supplier?.name,
      partyNationalId: p.supplier?.nationalId,
      projectName: p.project?.name,
      subtotal: Number(p.subtotal),
      taxPercent: Number(p.taxPercent),
      taxAmount: Number(p.taxAmount),
      totalAmount: Number(p.totalAmount),
    }));

    const salesRows = sales.map((p) => ({
      id: p.id,
      type: 'SALE',
      code: p.code,
      invoiceNumber: p.invoiceNumber,
      invoiceDate: p.invoiceDate,
      partyName: p.partner?.name || p.customer?.fullName,
      partyNationalId: p.partner?.nationalId || p.customer?.nationalId,
      projectName: p.project?.name,
      subtotal: Number(p.subtotal),
      taxPercent: Number(p.taxPercent),
      taxAmount: Number(p.taxAmount),
      totalAmount: Number(p.totalAmount),
    }));

    return {
      period: { from: params.fromDate, to: params.toDate },
      summary: {
        inputVAT: Math.round(inputVAT),
        outputVAT: Math.round(outputVAT),
        netVAT: Math.round(netVAT),
        payable: netVAT > 0 ? Math.round(netVAT) : 0,
        receivable: netVAT < 0 ? Math.round(Math.abs(netVAT)) : 0,
        purchaseCount: purchases.length,
        salesCount: sales.length,
      },
      purchases: purchaseRows,
      sales: salesRows,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 2) مالیات بر حقوق (لیست مالیات حقوق)
  // ═══════════════════════════════════════════════════════════
  async payrollTaxReport(params: { year: number; month: number; projectId?: string }) {
    const periodFilter: Prisma.PayrollPeriodWhereInput = {
      year: params.year,
      month: params.month,
    };
    if (params.projectId) periodFilter.projectId = params.projectId;
    const where: Prisma.PayrollRecordWhereInput = { period: periodFilter };

    const records = await this.prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, code: true, name: true, nationalId: true,
          },
        },
        employeeProfile: {
          select: {
            employeeCode: true, insuranceNumber: true, maritalStatus: true, childrenCount: true,
          },
        },
        period: {
          select: { id: true, code: true, title: true, year: true, month: true, project: { select: { name: true } } },
        },
      },
      orderBy: { rowNumber: 'asc' },
    });

    const rows = records.map((r) => ({
      id: r.id,
      employeeCode: r.employeeProfile?.employeeCode || r.employee?.code,
      employeeName: r.employee?.name,
      nationalId: r.employee?.nationalId,
      insuranceNumber: r.employeeProfile?.insuranceNumber,
      maritalStatus: r.employeeProfile?.maritalStatus,
      childrenCount: r.employeeProfile?.childrenCount,
      workDays: Number(r.workDays),
      grossSalary: Number(r.grossSalary),
      baseSalary: Number(r.baseSalary),
      housingAllow: Number(r.housingAllow),
      foodAllow: Number(r.foodAllow),
      childAllow: Number(r.childAllow),
      overtimeAmount: Number(r.overtimeAmount),
      bonusAmount: Number(r.bonusAmount),
      insuranceAmount: Number(r.insuranceAmount),
      taxPercent: Number(r.taxPercent),
      taxAmount: Number(r.taxAmount),
      netSalary: Number(r.netSalary),
      projectName: r.period?.project?.name,
      periodTitle: r.period?.title,
    }));

    const totals = {
      grossSalary: Math.round(rows.reduce((s, r) => s + r.grossSalary, 0)),
      insuranceAmount: Math.round(rows.reduce((s, r) => s + r.insuranceAmount, 0)),
      taxAmount: Math.round(rows.reduce((s, r) => s + r.taxAmount, 0)),
      netSalary: Math.round(rows.reduce((s, r) => s + r.netSalary, 0)),
      employees: rows.length,
    };

    return {
      period: { year: params.year, month: params.month },
      rows,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 3) لیست بیمه تأمین اجتماعی
  // ═══════════════════════════════════════════════════════════
  async insuranceReport(params: { year: number; month: number; projectId?: string }) {
    const periodFilter: Prisma.PayrollPeriodWhereInput = {
      year: params.year,
      month: params.month,
    };
    if (params.projectId) periodFilter.projectId = params.projectId;
    const where: Prisma.PayrollRecordWhereInput = { period: periodFilter };

    const records = await this.prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: { id: true, code: true, name: true, nationalId: true },
        },
        employeeProfile: {
          select: {
            employeeCode: true, insuranceNumber: true,
            insuranceStart: true, maritalStatus: true, childrenCount: true,
          },
        },
        period: {
          select: { id: true, code: true, title: true, year: true, month: true, project: { select: { name: true } } },
        },
      },
      orderBy: { rowNumber: 'asc' },
    });

    const rows = records.map((r) => {
      const gross = Number(r.grossSalary);
      const insurance = Number(r.insuranceAmount);
      // بیمه کارفرما معمولاً 23٪ (سهم کارفرما) در برابر 7٪ (سهم کارگر)
      const employerShare = Math.round(gross * 0.23);
      const totalInsurance = insurance + employerShare;

      return {
        id: r.id,
        insuranceNumber: r.employeeProfile?.insuranceNumber || '—',
        employeeCode: r.employeeProfile?.employeeCode || r.employee?.code,
        employeeName: r.employee?.name,
        nationalId: r.employee?.nationalId,
        maritalStatus: r.employeeProfile?.maritalStatus,
        childrenCount: r.employeeProfile?.childrenCount || 0,
        insuranceStart: r.employeeProfile?.insuranceStart,
        workDays: Number(r.workDays),
        grossSalary: gross,
        employeeShare: insurance,
        employerShare,
        totalInsurance,
        projectName: r.period?.project?.name,
      };
    });

    const totals = {
      grossSalary: Math.round(rows.reduce((s, r) => s + r.grossSalary, 0)),
      employeeShare: Math.round(rows.reduce((s, r) => s + r.employeeShare, 0)),
      employerShare: Math.round(rows.reduce((s, r) => s + r.employerShare, 0)),
      totalInsurance: Math.round(rows.reduce((s, r) => s + r.totalInsurance, 0)),
      employees: rows.length,
    };

    return {
      period: { year: params.year, month: params.month },
      rows,
      totals,
    };
  }
}
