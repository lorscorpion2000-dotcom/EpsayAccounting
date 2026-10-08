import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

// رویدادهای حساس امنیتی — برای گزارش امنیتی
const SECURITY_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED_LOCKED',
  'ACCOUNT_LOCKED',
];

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    payload?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          payload: data.payload || undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (e) {
      return null;
    }
  }

  async list(params: {
    userId?: string;
    entity?: string;
    action?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = params.action;
    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }
    if (params.search) {
      where.OR = [
        { entity: { contains: params.search, mode: 'insensitive' } },
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(200, Math.max(10, params.pageSize || 50));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async get(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, fullName: true } } },
    });
  }

  async stats(params?: { fromDate?: string; toDate?: string }) {
    const where: any = {};
    if (params && (params.fromDate || params.toDate)) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, byEntity, byAction, topUsers] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: Object.assign({}, where, { createdAt: { gte: today } }) }),
      this.prisma.auditLog.groupBy({ by: ['entity'], where, _count: true, orderBy: { _count: { entity: 'desc' } }, take: 10 }),
      this.prisma.auditLog.groupBy({ by: ['action'], where, _count: true, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      this.prisma.auditLog.groupBy({ by: ['userId'], where: Object.assign({}, where, { userId: { not: null } }), _count: true, orderBy: { _count: { userId: 'desc' } }, take: 10 }),
    ]);

    const userIds: string[] = topUsers.map((u) => u.userId).filter((x): x is string => x !== null);
    const users = userIds.length > 0 ? await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, fullName: true },
    }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      total,
      todayCount,
      byEntity: byEntity.map((e) => ({ entity: e.entity, count: e._count })),
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      topUsers: topUsers.map((u) => ({ userId: u.userId, user: u.userId ? userMap.get(u.userId) : null, count: u._count })),
    };
  }

  async cleanOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: result.count, cutoffDate: cutoff };
  }

  /**
   * رویدادهای امنیتی — فیلتر روی actions حساس
   */
  async securityEvents(params: {
    action?: string;
    fromDate?: string;
    toDate?: string;
    ipAddress?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {
      action: params.action ? params.action : { in: SECURITY_ACTIONS },
    };

    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    if (params.ipAddress) {
      where.ipAddress = { contains: params.ipAddress };
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(200, Math.max(10, params.pageSize || 50));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * آمار رویدادهای امنیتی (پیش‌فرض: ۲۴ ساعت اخیر)
   */
  async securityStats(params?: { fromDate?: string; toDate?: string }) {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const from = params?.fromDate ? new Date(params.fromDate) : defaultFrom;
    const to = params?.toDate ? new Date(params.toDate) : now;

    const where: any = {
      action: { in: SECURITY_ACTIONS },
      createdAt: { gte: from, lte: to },
    };

    const [total, byAction, failedRecent, topIps] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { gte: from, lte: to },
        },
        include: { user: { select: { id: true, username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          action: { in: ['LOGIN_FAILED', 'LOGIN_BLOCKED_LOCKED', 'ACCOUNT_LOCKED'] },
          createdAt: { gte: from, lte: to },
          ipAddress: { not: null },
        },
        _count: true,
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      total,
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      failedRecent,
      topIps: topIps.map((ip) => ({ ip: ip.ipAddress, count: ip._count })),
    };
  }
}
