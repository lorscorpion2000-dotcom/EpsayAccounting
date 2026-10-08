import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export type RecycleEntity = 'purchase-invoice' | 'purchase-order' | 'purchase-request' | 'journal-entry' | 'goods-receipt' | 'goods-issue' | 'subcontractor-statement';

export interface RecycleItem {
  id: string;
  entity: RecycleEntity;
  code: string | null;
  title: string | null;
  amount: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string | null;
  link: string;
}

@Injectable()
export class RecycleBinService {
  constructor(private prisma: PrismaService) {}

  async list(entity: string = 'all', limit = 200): Promise<RecycleItem[]> {
    const take = Math.min(500, limit);
    const out: RecycleItem[] = [];

    const want = (e: RecycleEntity) => entity === 'all' || entity === e;

    if (want('purchase-invoice')) {
      const rows = await (this.prisma as any).purchaseInvoice.findMany({
        __withDeleted: true,
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        select: { id: true, code: true, invoiceNumber: true, totalAmount: true, deletedAt: true, deletedBy: true, createdAt: true },
      });
      for (const r of rows) out.push({
        id: r.id, entity: 'purchase-invoice',
        code: r.code, title: 'فاکتور خرید ' + (r.invoiceNumber || ''),
        amount: Number(r.totalAmount || 0),
        deletedAt: r.deletedAt?.toISOString() || null,
        deletedBy: r.deletedBy || null,
        createdAt: r.createdAt?.toISOString() || null,
        link: '/procurement/invoices/' + r.id,
      });
    }

    if (want('purchase-order')) {
      const rows = await (this.prisma as any).purchaseOrder.findMany({
        __withDeleted: true,
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        select: { id: true, code: true, totalAmount: true, deletedAt: true, createdAt: true },
      });
      for (const r of rows) out.push({
        id: r.id, entity: 'purchase-order',
        code: r.code, title: 'دستور خرید',
        amount: Number(r.totalAmount || 0),
        deletedAt: r.deletedAt?.toISOString() || null,
        deletedBy: null,
        createdAt: r.createdAt?.toISOString() || null,
        link: '/procurement/orders/' + r.id,
      });
    }

    if (want('purchase-request')) {
      const rows = await (this.prisma as any).purchaseRequest.findMany({
        __withDeleted: true,
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        select: { id: true, code: true, reason: true, deletedAt: true, createdAt: true },
      });
      for (const r of rows) out.push({
        id: r.id, entity: 'purchase-request',
        code: r.code, title: 'درخواست خرید',
        amount: null,
        deletedAt: r.deletedAt?.toISOString() || null,
        deletedBy: null,
        createdAt: r.createdAt?.toISOString() || null,
        link: '/procurement/requests/' + r.id,
      });
    }

    if (want('journal-entry')) {
      const rows = await (this.prisma as any).journalEntry.findMany({
        __withDeleted: true,
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        select: { id: true, code: true, description: true, totalDebit: true, deletedAt: true, createdAt: true },
      });
      for (const r of rows) out.push({
        id: r.id, entity: 'journal-entry',
        code: r.code, title: r.description || 'سند حسابداری',
        amount: Number(r.totalDebit || 0),
        deletedAt: r.deletedAt?.toISOString() || null,
        deletedBy: null,
        createdAt: r.createdAt?.toISOString() || null,
        link: '/accounting/journals/' + r.id,
      });
    }

    out.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
    return out.slice(0, take);
  }

  async counts() {
    const [pi, po, pr, je] = await Promise.all([
      (this.prisma as any).purchaseInvoice.count({ __withDeleted: true, where: { deletedAt: { not: null } } }),
      (this.prisma as any).purchaseOrder.count({ __withDeleted: true, where: { deletedAt: { not: null } } }),
      (this.prisma as any).purchaseRequest.count({ __withDeleted: true, where: { deletedAt: { not: null } } }),
      (this.prisma as any).journalEntry.count({ __withDeleted: true, where: { deletedAt: { not: null } } }),
    ]);
    return {
      'purchase-invoice': pi,
      'purchase-order': po,
      'purchase-request': pr,
      'journal-entry': je,
      total: pi + po + pr + je,
    };
  }

  async restore(entity: RecycleEntity, id: string) {
    switch (entity) {
      case 'purchase-invoice':
        await this.prisma.purchaseInvoice.update({ where: { id }, data: { deletedAt: null, deletedBy: null } as any });
        break;
      case 'purchase-order':
        await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: null, deletedBy: null } as any });
        break;
      case 'purchase-request':
        await this.prisma.purchaseRequest.update({ where: { id }, data: { deletedAt: null, deletedBy: null } as any });
        break;
      case 'journal-entry':
        await this.prisma.journalEntry.update({ where: { id }, data: { deletedAt: null } as any });
        break;
      default:
        throw new NotFoundException('نوع نامعتبر: ' + entity);
    }
    return { ok: true, entity, id };
  }
}
