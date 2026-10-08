// ۲.۲-الف: endpoints امنیتی در audit
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function backup(full) {
  fs.copyFileSync(full, `${full}.bak-${STAMP}`);
  console.log(`  ✅ backup: ${path.basename(full)}`);
}

// ═══════════════════════════════════════════════════════════════
// 1) audit.service.ts — constant + دو متد جدید
// ═══════════════════════════════════════════════════════════════
console.log('\n--- audit.service.ts ---');
const svcPath = path.join(BACKEND, 'src', 'modules', 'audit', 'audit.service.ts');
backup(svcPath);
let svc = fs.readFileSync(svcPath, 'utf8');

if (svc.includes('SECURITY_ACTIONS')) {
  console.log('  ℹ️ از قبل هست — skip');
  process.exit(0);
}

// ۱.الف) افزودن constant قبل از @Injectable
const beforeClass = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()`;
const afterClass = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

// رویدادهای حساس امنیتی — برای گزارش امنیتی
const SECURITY_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED_LOCKED',
  'ACCOUNT_LOCKED',
];

@Injectable()`;

if (!svc.includes(beforeClass)) {
  console.log('  ❌ الگوی import پیدا نشد');
  process.exit(1);
}
svc = svc.replace(beforeClass, afterClass);
console.log('  ✅ constant اضافه شد');

// ۱.ب) افزودن متدها قبل از آخرین }
const securityMethods = `
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
`;

const lastBrace = svc.lastIndexOf('\n}');
if (lastBrace === -1) {
  console.log('  ❌ محل درج پیدا نشد');
  process.exit(1);
}
svc = svc.slice(0, lastBrace) + '\n' + securityMethods;
fs.writeFileSync(svcPath, svc, 'utf8');
console.log('  ✅ security methods اضافه شد');

// ═══════════════════════════════════════════════════════════════
// 2) audit.controller.ts — دو endpoint جدید (قبل از :id)
// ═══════════════════════════════════════════════════════════════
console.log('\n--- audit.controller.ts ---');
const ctrlPath = path.join(BACKEND, 'src', 'modules', 'audit', 'audit.controller.ts');
backup(ctrlPath);
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

if (ctrl.includes("@Get('security')")) {
  console.log('  ℹ️ از قبل هست — skip');
  process.exit(0);
}

// regex برای پیدا کردن `@Get(':id')`
const re = /(\s+)@Get\(':id'\)/;

if (!re.test(ctrl)) {
  console.log("  ❌ @Get(':id') پیدا نشد");
  process.exit(1);
}

const newEndpoints = `$1@Get('security')
$1@RequirePermissions('audit.read')
$1securityEvents(
$1  @Query('action') action?: string,
$1  @Query('fromDate') fromDate?: string,
$1  @Query('toDate') toDate?: string,
$1  @Query('ipAddress') ipAddress?: string,
$1  @Query('page') page?: string,
$1  @Query('pageSize') pageSize?: string,
$1) {
$1  return this.service.securityEvents({
$1    action, fromDate, toDate, ipAddress,
$1    page: page ? parseInt(page, 10) : 1,
$1    pageSize: pageSize ? parseInt(pageSize, 10) : 50,
$1  });
$1}

$1@Get('security/stats')
$1@RequirePermissions('audit.read')
$1securityStats(
$1  @Query('fromDate') fromDate?: string,
$1  @Query('toDate') toDate?: string,
$1) {
$1  return this.service.securityStats({ fromDate, toDate });
$1}

$1@Get(':id')`;

ctrl = ctrl.replace(re, newEndpoints);
fs.writeFileSync(ctrlPath, ctrl, 'utf8');
console.log('  ✅ endpoints اضافه شد');

console.log('\n══════════════════════════════');
console.log('=== DONE ✅ ===');