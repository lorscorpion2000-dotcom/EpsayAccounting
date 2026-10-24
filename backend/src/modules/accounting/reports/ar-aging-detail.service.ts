import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface ARInvoiceRow {
  id: string;
  code: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  receivedAmount: number;
  remaining: number;
  daysOverdue: number;
  bucket: 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'OVER_90';
  status: string;
  projectId: string | null;
  projectCode: string | null;
}

export interface ARCustomerRow {
  customerId: string;
  customerName: string;
  totalRemaining: number;
  bucket: { CURRENT: number; D1_30: number; D31_60: number; D61_90: number; OVER_90: number };
  invoices: ARInvoiceRow[];
}

export interface ARAgingDetailReport {
  asOf: string;
  totals: { current: number; d1_30: number; d31_60: number; d61_90: number; over90: number; total: number };
  customers: ARCustomerRow[];
}

@Injectable()
export class ARAgingDetailService {
  constructor(private prisma: PrismaService) {}

  private bucketFor(d: number): ARInvoiceRow['bucket'] {
    if (d <= 0)  return 'CURRENT';
    if (d <= 30) return 'D1_30';
    if (d <= 60) return 'D31_60';
    if (d <= 90) return 'D61_90';
    return 'OVER_90';
  }

  async buildReport(asOfISO?: string): Promise<ARAgingDetailReport> {
    const asOf = asOfISO ? new Date(asOfISO) : new Date();

    const invoices = await this.prisma.salesInvoice.findMany({
      where: { status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] } },
      include: {
        customer: { select: { id: true, fullName: true } },
        project:  { select: { id: true, code: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const custRows = new Map<string, ARCustomerRow>();
    const totals = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 };

    for (const inv of invoices) {
      const total = Number(inv.totalAmount);
      const received = Number(inv.receivedAmount);
      const remaining = Math.round((total - received) * 100) / 100;
      if (remaining <= 0.01) continue;

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
      const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / 86400000);
      const bucket = this.bucketFor(daysOverdue);

      const row: ARInvoiceRow = {
        id: inv.id, code: inv.code, invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
        totalAmount: total, receivedAmount: received, remaining,
        daysOverdue, bucket, status: inv.status,
        projectId: inv.projectId, projectCode: inv.project?.code ?? null,
      };

      if (!custRows.has(inv.customerId)) {
        custRows.set(inv.customerId, {
          customerId: inv.customerId,
          customerName: inv.customer?.fullName ?? '—',
          totalRemaining: 0,
          bucket: { CURRENT: 0, D1_30: 0, D31_60: 0, D61_90: 0, OVER_90: 0 },
          invoices: [],
        });
      }
      const c = custRows.get(inv.customerId)!;
      c.totalRemaining += remaining;
      c.bucket[bucket] += remaining;
      c.invoices.push(row);

      const key: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'over90' = bucket === 'CURRENT' ? 'current'
        : bucket === 'D1_30'  ? 'd1_30'
        : bucket === 'D31_60' ? 'd31_60'
        : bucket === 'D61_90' ? 'd61_90' : 'over90';
      totals[key] += remaining;
      totals.total += remaining;
    }

    const customers = Array.from(custRows.values()).map((c) => ({
      ...c,
      totalRemaining: Math.round(c.totalRemaining * 100) / 100,
      bucket: {
        CURRENT: Math.round(c.bucket.CURRENT * 100) / 100,
        D1_30:   Math.round(c.bucket.D1_30   * 100) / 100,
        D31_60:  Math.round(c.bucket.D31_60  * 100) / 100,
        D61_90:  Math.round(c.bucket.D61_90  * 100) / 100,
        OVER_90: Math.round(c.bucket.OVER_90 * 100) / 100,
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
      customers,
    };
  }
}