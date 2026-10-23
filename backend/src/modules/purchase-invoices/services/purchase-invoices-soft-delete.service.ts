import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PurchaseInvoicesSoftDeleteService {
  constructor(private prisma: PrismaService) {}

  async softDelete(id: string, userId?: string, reason?: string, _meta: Record<string, unknown> = {}) {
    const existing = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (existing.deletedAt) {
      return { ok: true, id, softDeleted: true, alreadyDeleted: true };
    }
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!existing.deletedAt) throw new Error('رکورد حذف نشده است');
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: Record<string, unknown> = {}) {
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }
}
