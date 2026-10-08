import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface APInvoiceRow {
  id: string;
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  daysOverdue: number;
  bucket: 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'OVER_90';
  status: string;
  projectId: string | null;
  projectCode: string | null;
}

export interface APSupplierRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  totalRemaining: number;
  bucket: { CURRENT: number; D1_30: number; D31_60: number; D61_90: number; OVER_90: number };
  invoices: APInvoiceRow[];
}

export interface APAgingDetailReport {
  asOf: string;
  totals: {
    current: number;
    d1_30: number;
    d31_60: number;
    d61_90: number;
    over90: number;
    total: number;
  };
  suppliers: APSupplierRow[];
}

@Injectable()
export class APAgingDetailService {
  constructor(private prisma: PrismaService) {}

  private bucketFor(daysOverdue: number): APInvoiceRow['bucket'] {
    if (daysOverdue <= 0)   return 'CURRENT';
    if (daysOverdue <= 30)  return 'D1_30';
    if (daysOverdue <= 60)  return 'D31_60';
    if (daysOverdue <= 90)  return 'D61_90';
    return 'OVER_90';
  }

  async buildReport(asOfISO?: string): Promise<APAgingDetailReport> {
    const asOf = asOfISO ? new Date(asOfISO) : new Date();
    const suppliers = await this.prisma.partner.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, type: true },
    });
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    // همه فاکتورهای تأییدشده/نیمه‌پرداخت‌شده که مانده دارن
    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        status: { in: ['APPROVED', 'PARTIALLY_PAID'] },
      },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        project:  { select: { id: true, code: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const supplierRows = new Map<string, APSupplierRow>();
    const totals = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 };

    for (const inv of invoices) {
      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount);
      const remaining = Math.round((total - paid) * 100) / 100;
      if (remaining <= 0.01) continue;

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const diffMs = asOf.getTime() - due.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const bucket = this.bucketFor(daysOverdue);

      const row: APInvoiceRow = {
        id: inv.id,
        code: inv.code,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
        totalAmount: total,
        paidAmount: paid,
        remaining,
        daysOverdue,
        bucket,
        status: inv.status,
        projectId: inv.projectId,
        projectCode: inv.project?.code ?? null,
      };

      if (!supplierRows.has(inv.supplierId)) {
        supplierRows.set(inv.supplierId, {
          supplierId: inv.supplierId,
          supplierCode: inv.supplier?.code ?? supplierMap.get(inv.supplierId)?.code ?? '—',
          supplierName: inv.supplier?.name ?? supplierMap.get(inv.supplierId)?.name ?? '—',
          totalRemaining: 0,
          bucket: { CURRENT: 0, D1_30: 0, D31_60: 0, D61_90: 0, OVER_90: 0 },
          invoices: [],
        });
      }
      const sup = supplierRows.get(inv.supplierId)!;
      sup.totalRemaining += remaining;
      sup.bucket[bucket] += remaining;
      sup.invoices.push(row);

      const tKey = bucket === 'CURRENT' ? 'current'
        : bucket === 'D1_30'  ? 'd1_30'
        : bucket === 'D31_60' ? 'd31_60'
        : bucket === 'D61_90' ? 'd61_90'
        : 'over90';
      (totals as any)[tKey] += remaining;
      totals.total += remaining;
    }

    const suppliersArr = Array.from(supplierRows.values()).map((s) => ({
      ...s,
      totalRemaining: Math.round(s.totalRemaining * 100) / 100,
      bucket: {
        CURRENT: Math.round(s.bucket.CURRENT * 100) / 100,
        D1_30:   Math.round(s.bucket.D1_30   * 100) / 100,
        D31_60:  Math.round(s.bucket.D31_60  * 100) / 100,
        D61_90:  Math.round(s.bucket.D61_90  * 100) / 100,
        OVER_90: Math.round(s.bucket.OVER_90 * 100) / 100,
      },
    })).sort((a, b) => b.totalRemaining - a.totalRemaining);

    return {
      asOf: asOf.toISOString(),
      totals: {
        current: Math.round(totals.current * 100) / 100,
        d1_30:   Math.round(totals.d1_30   * 100) / 100,
        d31_60:  Math.round(totals.d31_60  * 100) / 100,
        d61_90:  Math.round(totals.d61_90  * 100) / 100,
        over90:  Math.round(totals.over90  * 100) / 100,
        total:   Math.round(totals.total   * 100) / 100,
      },
      suppliers: suppliersArr,
    };
  }
}