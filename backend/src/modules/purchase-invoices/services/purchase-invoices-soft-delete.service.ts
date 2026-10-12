import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PurchaseInvoicesSoftDeleteService {
  constructor(private prisma: PrismaService) {}

  async softDelete(id: string, userId?: string, reason?: string, _meta: any = {}) {
    const existing: any = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if ((existing as any).deletedAt) {
      return { ok: true, id, softDeleted: true, alreadyDeleted: true };
    }
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null } as any,
    });
    return { ok: true, id, softDeleted: true, reason: reason || null, deletedBy: userId || null };
  }

  async restore(id: string, userId?: string) {
    const existing: any = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('رکورد یافت نشد');
    if (!(existing as any).deletedAt) throw new Error('رکورد حذف نشده است');
    await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
    });
    return { ok: true, id, restored: true, by: userId || null };
  }

  async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }
}
