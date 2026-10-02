import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const SNAPSHOTS = path.join(ROOT, 'snapshots');
const NOTES = path.join(ROOT, 'session-notes.md');

fs.mkdirSync(SNAPSHOTS, { recursive: true });

const lines = [];
const W = (s = '') => lines.push(s);
const H = (t) => { W(''); W('='.repeat(72)); W('  ' + t); W('='.repeat(72)); };

function skipDir(name) {
  return ['node_modules','.git','dist','build','.next','coverage','.vite'].includes(name);
}
function walk(dir, ext, maxDepth = 6) {
  const out = [];
  const rec = (d, depth) => {
    if (depth > maxDepth) return;
    let items;
    try { items = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      if (it.isDirectory()) {
        if (!skipDir(it.name)) rec(path.join(d, it.name), depth + 1);
      } else if (ext.some((e) => it.name.endsWith(e))) {
        out.push(path.join(d, it.name));
      }
    }
  };
  rec(dir, 0);
  return out;
}
const rel = (p, base) => path.relative(base, p).replace(/\\/g, '/');

// ═══════════════════════════════════════════════════════════
async function main() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  W('PROJECT STATE SNAPSHOT — Epsay Accounting');
  W('Generated: ' + now);
  W('Root: ' + ROOT);

  // ─── بخش ۰: اطلاعات محیط ───────────────────────────
  H('0. ENVIRONMENT');
  W('  Node: ' + process.version);
  try {
    const fePkg = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'package.json'), 'utf8'));
    const bePkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
    W('  Frontend: ' + fePkg.name + '@' + fePkg.version);
    W('  Backend:  ' + bePkg.name + '@' + bePkg.version);
    W('  FE deps:  react ' + (fePkg.dependencies.react || '?') +
      ', vite ' + (fePkg.devDependencies.vite || '?'));
    W('  BE deps:  @nestjs/common ' + (bePkg.dependencies['@nestjs/common'] || '?') +
      ', prisma ' + (bePkg.dependencies['@prisma/client'] || '?'));
  } catch (e) { W('  (خطا در خواندن package.json)'); }

  // ─── بخش ۱: ساختار بک‌اند ──────────────────────────
  H('1. BACKEND MODULES');
  const beModulesDir = path.join(BACKEND, 'src/modules');
  if (fs.existsSync(beModulesDir)) {
    const mods = fs.readdirSync(beModulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const m of mods) {
      const files = walk(path.join(beModulesDir, m), ['.ts'], 3);
      const ctrl = files.filter((f) => f.endsWith('.controller.ts')).length;
      const svc = files.filter((f) => f.endsWith('.service.ts')).length;
      const dto = files.filter((f) => f.includes('/dto/')).length;
      W('  • ' + m.padEnd(22) + '  controllers:' + ctrl + '  services:' + svc + '  dtos:' + dto);
    }
  }

  // ─── بخش ۲: endpoints + permissions ────────────────
  H('2. BACKEND ENDPOINTS (Controller + Method + Path + Permission)');
  if (fs.existsSync(beModulesDir)) {
    for (const file of walk(beModulesDir, ['.controller.ts'])) {
      const c = fs.readFileSync(file, 'utf8');
      const controllerMatch = c.match(/@Controller\(['"]([^'"]*)['"]\)/);
      if (!controllerMatch) continue;
      const base = controllerMatch[1];
      W('');
      W('  [' + rel(file, beModulesDir) + ']');
      // پیدا کردن هر @Get/@Post/@Patch/@Put/@Delete با permission بعدی
      const methodRegex = /@(Get|Post|Patch|Put|Delete)\([^)]*\)[\s\S]{0,200}?@RequirePermissions\(([^)]+)\)/g;
      let m;
      while ((m = methodRegex.exec(c)) !== null) {
        const verb = m[1];
        const perms = (m[2].match(/['"]([^'"]+)['"]/g) || []).map((x) => x.replace(/['"]/g, '')).join(',');
        // پیدا کردن پارامتر مسیر داخل (): @Get('xxx')
        const pathMatch = m[0].match(new RegExp('@' + verb + '\\(([^)]*)\\)'));
        const subPath = pathMatch ? pathMatch[1].replace(/['"]/g, '') : '';
        W('    ' + verb.padEnd(6) + ' /' + base + (subPath ? '/' + subPath : '') + '   [' + perms + ']');
      }
    }
  }

  // ─── بخش ۳: ماژول‌های فرانت‌اند ────────────────────
  H('3. FRONTEND MODULES');
  const feModulesDir = path.join(FRONTEND, 'src/modules');
  if (fs.existsSync(feModulesDir)) {
    const mods = fs.readdirSync(feModulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const m of mods) {
      const files = walk(path.join(feModulesDir, m), ['.tsx', '.ts'], 3);
      const pages = files.filter((f) => f.includes('/pages/')).length;
      const comps = files.filter((f) => f.includes('/components/')).length;
      const apis = files.filter((f) => f.includes('.api.ts')).length;
      W('  • ' + m.padEnd(22) + '  pages:' + pages + '  components:' + comps + '  api:' + apis);
    }
  }

  // ─── بخش ۴: Routes ────────────────────────────────
  H('4. FRONTEND ROUTES (from router.tsx)');
  const routerPath = path.join(FRONTEND, 'src/app/router.tsx');
  if (fs.existsSync(routerPath)) {
    const rc = fs.readFileSync(routerPath, 'utf8');
    const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
    let m;
    while ((m = routeRegex.exec(rc)) !== null) W('  ' + m[1]);
  }

  // ─── بخش ۵: Sidebar ───────────────────────────────
  H('5. SIDEBAR MENU (from MainLayout.tsx)');
  const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');
  if (fs.existsSync(layoutPath)) {
    const lc = fs.readFileSync(layoutPath, 'utf8');
    const sectionRegex = /key:\s*['"]([^'"]+)['"][\s\S]{0,80}?title:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = sectionRegex.exec(lc)) !== null) {
      W('  [' + m[1] + '] ' + m[2]);
    }
  }

  // ─── بخش ۶: Prisma Models + Enums ─────────────────
  H('6. PRISMA MODELS + ENUMS');
  const schemaPath = path.join(BACKEND, 'prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const sc = fs.readFileSync(schemaPath, 'utf8');
    const models = [...sc.matchAll(/^model\s+(\w+)/gm)].map((x) => x[1]);
    const enums = [...sc.matchAll(/^enum\s+(\w+)/gm)].map((x) => x[1]);
    W('  Models (' + models.length + '):');
    W('    ' + models.join(', '));
    W('');
    W('  Enums (' + enums.length + '):');
    W('    ' + enums.join(', '));
  }

  // ─── بخش ۷: Migrations ────────────────────────────
  H('7. MIGRATIONS');
  const migDir = path.join(BACKEND, 'prisma/migrations');
  if (fs.existsSync(migDir)) {
    const migs = fs.readdirSync(migDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name).sort();
    for (const m of migs) W('  • ' + m);
  }

  // ─── بخش ۸: DB State ──────────────────────────────
  H('8. DATABASE STATE');
  try {
    const prisma = new PrismaClient();
    const counts = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      rolePermissions: await prisma.rolePermission.count(),
      partners: await prisma.partner.count(),
      projects: await prisma.project.count(),
      permits: await prisma.permit.count(),
      legalContracts: await prisma.legalContract.count(),
      legalParties: await prisma.legalContractParty.count(),
      salesUnits: await prisma.salesUnit.count(),
      salesContracts: await prisma.salesContract.count(),
      salesCustomers: await prisma.salesCustomer.count(),
      accounts: await prisma.account.count(),
      journals: await prisma.journalEntry.count(),
    };
    for (const [k, v] of Object.entries(counts)) W('  ' + k.padEnd(20) + ': ' + v);

    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
      include: { roles: { include: { role: true } } },
    });
    W('');
    W('  Admin user: ' + (admin ? 'EXISTS (roles: ' + admin.roles.map((r) => r.role.code).join(',') + ')' : 'MISSING!'));
    await prisma.$disconnect();
  } catch (e) {
    W('  (خطا در اتصال دیتابیس: ' + e.message + ')');
  }

  // ─── بخش ۹: فایل‌های تغییریافته اخیر ──────────────
  H('9. RECENTLY MODIFIED FILES (last 24h)');
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = [];
  for (const base of [path.join(BACKEND, 'src'), path.join(FRONTEND, 'src')]) {
    if (!fs.existsSync(base)) continue;
    for (const f of walk(base, ['.ts', '.tsx'])) {
      const st = fs.statSync(f);
      if (st.mtimeMs > cutoff) recent.push({ p: rel(f, base), t: st.mtimeMs });
    }
  }
  recent.sort((a, b) => b.t - a.t);
  for (const r of recent.slice(0, 30)) W('  • ' + r.p);

  // ─── بخش ۱۰: TODO / FIXME ─────────────────────────
  H('10. TODO / FIXME MARKERS');
  const todos = [];
  for (const base of [path.join(BACKEND, 'src'), path.join(FRONTEND, 'src')]) {
    if (!fs.existsSync(base)) continue;
    for (const f of walk(base, ['.ts', '.tsx'])) {
      const c = fs.readFileSync(f, 'utf8');
      const regex = /\/\/\s*(TODO|FIXME|HACK|XXX)[:\s](.+)/g;
      let m;
      while ((m = regex.exec(c)) !== null) {
        todos.push(rel(f, base) + '  → ' + m[1] + ': ' + m[2].trim().slice(0, 80));
      }
    }
  }
  if (todos.length === 0) W('  (هیچ موردی پیدا نشد)');
  else for (const t of todos.slice(0, 30)) W('  • ' + t);

  // ─── بخش ۱۱: یادداشت‌های جلسه ─────────────────────
  H('11. SESSION NOTES (from session-notes.md)');
  if (fs.existsSync(NOTES)) {
    const c = fs.readFileSync(NOTES, 'utf8');
    for (const line of c.split('\n')) W('  ' + line);
  } else {
    W('  (فایل session-notes.md وجود ندارد)');
    W('  → می‌توانید خودتان بسازید تا یادداشت‌ها در snapshot ظاهر شوند');
  }

  // ─── پایان ────────────────────────────────────────
  H('END OF SNAPSHOT');
  W('  برای چت جدید، این فایل را در پیام اول Paste کنید.');
  W('');

  // ذخیره
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = path.join(SNAPSHOTS, 'state-' + stamp + '.txt');
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');

  console.log('=========================================');
  console.log('  SNAPSHOT SAVED');
  console.log('=========================================');
  console.log('  Path: ' + outFile);
  console.log('  Lines: ' + lines.length);
  console.log('  Size: ' + (fs.statSync(outFile).size / 1024).toFixed(2) + ' KB');
  console.log('');
  console.log('  Now copying to clipboard...');

  // کپی به کلیپ‌بورد ویندوز
  const { spawnSync } = await import('node:child_process');
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-Command',
      'Get-Content -Raw -Encoding UTF8 "' + outFile + '" | Set-Clipboard']);
    if (r.status === 0) console.log('  OK — pasted to clipboard!');
    else console.log('  (کپی خودکار نشد — فایل را دستی باز کنید)');
  } catch (e) {
    console.log('  (کپی خودکار نشد — فایل را دستی باز کنید)');
  }
  console.log('');
  console.log('  Next step: open a NEW chat with the AI and paste (Ctrl+V)');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });