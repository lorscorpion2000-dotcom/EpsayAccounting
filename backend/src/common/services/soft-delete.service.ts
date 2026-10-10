import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../modules/audit/audit.service';

interface AdminUser {
  id: string;
  username?: string;
  fullName?: string;
}

interface DeleteMeta {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * سرویس مشترک Soft Delete / Restore / Hard Delete
 * برای همه ماژول‌ها قابل استفاده است.
 *
 * نمونه:
 *   this.softDelete.adminDelete({
 *     model: 'project',
 *     id, user: req.user, reason: body.reason,
 *     meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
 *   })
 */
@Injectable()
export class SoftDeleteService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private getClient(model: string): any {
    const client = (this.prisma as any)[model];
    if (!client) {
      throw new NotFoundException('مدل ' + model + ' در Prisma یافت نشد');
    }
    return client;
  }

  private validateReason(reason?: string): string {
    const r = (reason || '').trim();
    if (r.length < 3) {
      throw new BadRequestException('دلیل باید حداقل ۳ کاراکتر باشد');
    }
    return r;
  }

  /** حذف نرم توسط مدیر (idempotent) */
  async adminDelete(params: {
    model: string;
    id: string;
    user: AdminUser;
    reason: string;
    meta?: DeleteMeta;
  }) {
    const reason = this.validateReason(params.reason);
    const client = this.getClient(params.model);

    const existing = await client.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundException('رکورد یافت نشد');

    if (existing.deletedAt) {
      return { ok: true, id: params.id, alreadyDeleted: true };
    }

    await client.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedBy: params.user.id },
    });

    // لاگ
    try {
      await this.audit.log({
        userId: params.user.id,
        action: 'ADMIN_SOFT_DELETE',
        entity: params.model,
        entityId: params.id,
        payload: { reason, username: params.user.username, fullName: params.user.fullName },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
      });
    } catch { /* silent */ }

    return { ok: true, id: params.id, deleted: true, reason };
  }

  /** بازیابی رکورد حذف‌شده */
  async restore(params: { model: string; id: string; user: AdminUser; meta?: DeleteMeta }) {
    const client = this.getClient(params.model);

    const existing = await client.findUnique({ where: { id: params.id } });
    if (!existing) throw new NotFoundException('رکورد یافت نشد');
    if (!existing.deletedAt) {
      return { ok: true, id: params.id, alreadyActive: true };
    }

    await client.update({
      where: { id: params.id },
      data: { deletedAt: null, deletedBy: null },
    });

    try {
      await this.audit.log({
        userId: params.user.id,
        action: 'ADMIN_RESTORE',
        entity: params.model,
        entityId: params.id,
        payload: { username: params.user.username, fullName: params.user.fullName },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
      });
    } catch { /* silent */ }

    return { ok: true, id: params.id, restored: true };
  }

  /** لیست رکوردهای حذف‌شده */
  async listDeleted(params: { model: string; take?: number; skip?: number }) {
    const client = this.getClient(params.model);
    const take = Math.min(params.take ?? 100, 500);
    const skip = params.skip ?? 0;

    const [items, total] = await Promise.all([
      client.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take,
        skip,
      }),
      client.count({ where: { deletedAt: { not: null } } }),
    ]);

    return { items, total, take, skip };
  }
}
