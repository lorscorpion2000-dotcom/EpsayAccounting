import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = [
  { path: 'src/modules/payroll/payroll-periods.controller.ts', prisma: 'payrollPeriod', perm: 'payroll.update' },
  { path: 'src/modules/payroll/worker-statements.controller.ts', prisma: 'workerStatement', perm: 'payroll.update' },
  { path: 'src/modules/payroll/advance-requests.controller.ts', prisma: 'advanceRequest', perm: 'payroll.update' },
  { path: 'src/modules/payroll/leave-requests.controller.ts', prisma: 'leaveRequest', perm: 'payroll.update' },
  { path: 'src/modules/payroll/work-logs.controller.ts', prisma: 'dailyWorkLog', perm: 'payroll.update' },
  { path: 'src/modules/site-ops/site-ops.controller.ts', prisma: 'dailyReport', perm: 'site-ops.update' },
  { path: 'src/modules/sales/sales.controller.ts', prisma: 'salesUnit', perm: 'sales.update' },
  { path: 'src/modules/users/users.controller.ts', prisma: 'user', perm: 'users.update' },
  { path: 'src/modules/roles/roles.controller.ts', prisma: 'role', perm: 'roles.update' },
  { path: 'src/modules/units/units.controller.ts', prisma: 'unit', perm: 'settings.update' },
  { path: 'src/modules/accounting/fiscal-years.controller.ts', prisma: 'fiscalYear', perm: 'accounting.update' },
];

let ok = 0, skip = 0, err = 0;

for (const t of TARGETS) {
  const FILE = path.join(__dirname, t.path);
  console.log('\n📁', t.path);

  if (!fs.existsSync(FILE)) { console.log('   ❌ پیدا نشد'); err++; continue; }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-adm2-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  let ch = 0;

  if (srcN.includes('SoftDeleteService')) {
    console.log('   ℹ️  از قبل دارد');
    skip++;
    continue;
  }

  // ۱. import
  if (!srcN.includes('SoftDeleteService')) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import { SoftDeleteService } from '../../common/services/soft-delete.service';`);
    srcN = lines.join('\n');
    ch++;
  }

  // ۲. constructor inject
  const ctorMatch = srcN.match(/(constructor\s*\(([^)]*)\))/);
  if (ctorMatch) {
    const params = ctorMatch[2].trim();
    if (!params.includes('SoftDeleteService')) {
      const newParams = params.endsWith(',')
        ? params + '\n    private softDelete: SoftDeleteService,'
        : params + ',\n    private softDelete: SoftDeleteService,';
      srcN = srcN.replace(ctorMatch[0], `constructor(${newParams})`);
      ch++;
    }
  } else {
    console.log('   ⚠️  constructor پیدا نشد');
  }

  // ۳. endpoint ها
  const endpoints = `
  // ═══════════════════════════════════════════════════════
  // Admin Delete / Restore
  // ═══════════════════════════════════════════════════════

  @Delete(':id/admin')
  @RequirePermissions('${t.perm}')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: '${t.prisma}',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Patch(':id/restore')
  @RequirePermissions('${t.perm}')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: '${t.prisma}',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }

  @Get('deleted/list')
  @RequirePermissions('${t.perm}')
  listDeleted(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.softDelete.listDeleted({
      model: '${t.prisma}',
      take: take ? parseInt(take, 10) : 100,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }
`;

  const lastBrace = srcN.lastIndexOf('}');
  srcN = srcN.slice(0, lastBrace) + endpoints + '\n' + srcN.slice(lastBrace);
  ch++;

  // ۴. imports NestJS
  const needed = ['Delete', 'Patch', 'Req', 'Body', 'Query', 'Param'];
  const nestMatch = srcN.match(/import\s*\{([^}]+)\}\s*from\s*['"]@nestjs\/common['"]/);
  if (nestMatch) {
    const current = nestMatch[1].split(',').map(s => s.trim());
    const missing = needed.filter(n => !current.includes(n));
    if (missing.length > 0) {
      const merged = [...new Set([...current, ...missing])].filter(Boolean).sort();
      srcN = srcN.replace(nestMatch[0], `import { ${merged.join(', ')} } from '@nestjs/common';`);
      ch++;
    }
  }

  // ۵. RequirePermissions import
  if (!srcN.match(/import[^;]*RequirePermissions/)) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import { RequirePermissions } from '../../common/decorators/permissions.decorator';`);
    srcN = lines.join('\n');
    ch++;
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('   ✅ مجموع:', ch);
  ok++;
}

console.log(`\n═══ ✅ ${ok} موفق، ⏭️  ${skip} skip، ❌ ${err} خطا ═══`);