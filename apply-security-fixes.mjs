// E:\EpsayAccounting\apply-security-fixes.mjs
//
// اجرای خودکار اصلاحات امنیتی و صحت داده Epsay Accounting
// این فایل را با انکودینگ UTF-8 ذخیره کنید (پیش‌فرض همهٔ ویرایشگرهای مدرن).
//
// اجرا:
//   node apply-security-fixes.mjs --dry-run   ← پیش‌نمایش بدون تغییر
//   node apply-security-fixes.mjs             ← اجرای کامل + build
//   node apply-security-fixes.mjs --no-build  ← بدون build
//
// پشتیبان‌گیری: هر فایل قبل از تغییر با پسوند .bak-<timestamp> کپی می‌شود.
// بازگردانی: backup-20251023-143015 را با نام اصلی جایگزین کنید.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ──────────────────────────────────────────────────────────
// پیکربندی
// ──────────────────────────────────────────────────────────
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const DRY = process.argv.includes('--dry-run');
const NO_BUILD = process.argv.includes('--no-build');

// ⚠️ Self-check: اگر فایل خراب باشد، این تست رد می‌شود
const PERSIAN_CHECK = 'سلام';
if (PERSIAN_CHECK !== '\u0633\u0644\u0627\u0645') {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('  ❌ ENCODING ERROR — فایل دچار مشکل انکودینگ است');
    console.error('═══════════════════════════════════════════════════════');
    console.error('  متن فارسی در فایل به‌درستی decode نمی‌شود.');
    console.error('  راه‌حل: فایل را دوباره از چت کپی و به‌صورت UTF-8 ذخیره کنید.');
    console.error('  در VSCode: پایین-راست → UTF-8 → Save with Encoding → UTF-8');
    console.error('');
    process.exit(1);
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
let okCount = 0;
let skipCount = 0;
let failCount = 0;

function applyFix({ label, relPath, search, replace }) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`[SKIP] ${label}  (فایل نیست: ${relPath})`);
        skipCount++;
        return;
    }
    let content;
    try {
        content = fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
        console.log(`[FAIL] ${label}  (خطای خواندن: ${e.message})`);
        failCount++;
        return;
    }
    const idx = content.indexOf(search);
    if (idx === -1) {
        console.log(`[SKIP] ${label}  (الگو یافت نشد — شاید قبلاً اعمال شده)`);
        skipCount++;
        return;
    }
    const second = content.indexOf(search, idx + search.length);
    if (second !== -1) {
        console.log(`[FAIL] ${label}  (چند تطبیق — بررسی دستی)`);
        failCount++;
        return;
    }
    if (DRY) {
        console.log(`[DRY]  ${label}  (would replace ${search.length} chars)`);
        okCount++;
        return;
    }
    fs.copyFileSync(fullPath, `${fullPath}.bak-${TS}`);
    const newContent = content.slice(0, idx) + replace + content.slice(idx + search.length);
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`[OK]   ${label}`);
    okCount++;
}

function writeNewFile({ label, relPath, content, overwrite = false }) {
    const fullPath = path.join(ROOT, relPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        console.log(`[SKIP] ${label}  (پوشه نیست: ${dir})`);
        skipCount++;
        return;
    }
    if (fs.existsSync(fullPath) && !overwrite) {
        console.log(`[SKIP] ${label}  (از قبل موجود)`);
        skipCount++;
        return;
    }
    if (DRY) {
        console.log(`[DRY]  ${label}  (would write ${content.length} chars)`);
        okCount++;
        return;
    }
    if (fs.existsSync(fullPath)) {
        fs.copyFileSync(fullPath, `${fullPath}.bak-${TS}`);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[OK]   ${label}`);
    okCount++;
}

// ══════════════════════════════════════════════════════════
// Header
// ══════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  Epsay Accounting — Security & Quality Fixes');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Root     : ${ROOT}`);
console.log(`  DryRun   : ${DRY}`);
console.log(`  NoBuild  : ${NO_BUILD}`);
console.log(`  Timestamp: ${TS}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');

// ══════════════════════════════════════════════════════════
// FIX 1 — 2FA bypass در otpVerify
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F1: 2FA bypass (otpVerify reject {valid:false})',
    relPath: 'backend/src/modules/auth/two-factor.service.ts',
    search: [
        "    if (typeof _otp.verify === 'function') {",
        "      const r = _otp.verify({ token: clean, secret });",
        "      if (isPromise(r)) return await r;",
        "      return !!r;",
        "    }",
    ].join('\n'),
    replace: [
        "    if (typeof _otp.verify === 'function') {",
        "      const r = _otp.verify({ token: clean, secret });",
        "      const resolved = isPromise(r) ? await r : r;",
        "      // CRITICAL: some otplib versions return { valid: false } object;",
        "      // `!!r` on an object is always true → 2FA is fully bypassed.",
        "      if (typeof resolved === 'boolean') return resolved;",
        "      if (resolved && typeof resolved === 'object'",
        "          && typeof (resolved as any).valid === 'boolean') {",
        "        return (resolved as any).valid === true;",
        "      }",
        "      return false;",
        "    }",
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 2 — Recovery codes با CSPRNG
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F2: recovery codes use crypto.randomInt',
    relPath: 'backend/src/modules/auth/two-factor.service.ts',
    search: [
        "      const chunk1 = Math.random().toString(36).substring(2, 6).toUpperCase();",
        "      const chunk2 = Math.random().toString(36).substring(2, 6).toUpperCase();",
    ].join('\n'),
    replace: [
        "      // استفاده از CSPRNG به‌جای Math.random (قابل پیش‌بینی)",
        "      const chunk1 = crypto.randomInt(0x10000).toString(16).padStart(4, '0').toUpperCase();",
        "      const chunk2 = crypto.randomInt(0x10000).toString(16).padStart(4, '0').toUpperCase();",
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 3 — changePassword (باگ DTO→string)
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F3: changePassword passes strings',
    relPath: 'backend/src/modules/auth/auth.controller.ts',
    search: 'return this.authService.changePassword(user.id, dto as any, dto.newPassword);',
    replace: 'return this.authService.changePassword(user.id, dto.oldPassword, dto.newPassword);',
});

// ══════════════════════════════════════════════════════════
// FIX 4 — updatePreferences (باگ DTO→string)
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F4: updatePreferences passes theme string',
    relPath: 'backend/src/modules/auth/auth.controller.ts',
    search: 'return this.authService.updatePreferences(user.id, dto as any);',
    replace: 'return this.authService.updatePreferences(user.id, dto.themePreference);',
});

// ══════════════════════════════════════════════════════════
// FIX 5 — endpoint تأیید 2FA (public) — بعد از F3/F4
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F5: add POST /auth/2fa/verify endpoint',
    relPath: 'backend/src/modules/auth/auth.controller.ts',
    search: [
        '    return this.authService.updatePreferences(user.id, dto.themePreference);',
        '  }',
        '}',
    ].join('\n'),
    replace: [
        '    return this.authService.updatePreferences(user.id, dto.themePreference);',
        '  }',
        '',
        "  // endpoint عمومی تأیید کد 2FA بعد از login",
        '  @Public()',
        "  @Post('2fa/verify')",
        '  @HttpCode(HttpStatus.OK)',
        '  @Throttle({ default: { limit: 5, ttl: 60000 } })',
        '  async verify2FALogin(',
        '    @Body() dto: TwoFactorVerifyLoginDto,',
        '    @Req() req: any,',
        '  ) {',
        '    const ip = req.ip;',
        "    const ua = req.headers['user-agent'] as string | undefined;",
        '    return this.authService.verify2FALogin(dto.totpToken, dto.code, { ip, ua });',
        '  }',
        '}',
    ].join('\n'),
});

// اضافه‌کردن import لازم برای F5
applyFix({
    label: 'F5-import: TwoFactorVerifyLoginDto import',
    relPath: 'backend/src/modules/auth/auth.controller.ts',
    search: "import { TwoFactorCodeDto, TwoFactorDisableDto } from './dto/two-factor.dto';",
    replace: "import { TwoFactorCodeDto, TwoFactorDisableDto, TwoFactorVerifyLoginDto } from './dto/two-factor.dto';",
});

// ══════════════════════════════════════════════════════════
// FIX 6 — DTO فایل برای تأیید 2FA (اگر موجود نبود)
// ══════════════════════════════════════════════════════════
{
    const dtoPath = path.join(ROOT, 'backend/src/modules/auth/dto/two-factor.dto.ts');
    const hasDto = fs.existsSync(dtoPath) && fs.readFileSync(dtoPath, 'utf8').includes('TwoFactorVerifyLoginDto');
    if (!hasDto) {
        writeNewFile({
            label: 'F6: create TwoFactorVerifyLoginDto',
            relPath: 'backend/src/modules/auth/dto/two-factor.dto.ts',
            content: [
                "import { ApiProperty } from '@nestjs/swagger';",
                "import { IsString, MinLength } from 'class-validator';",
                '',
                'export class TwoFactorCodeDto {',
                "  @ApiProperty({ example: '123456' })",
                '  @IsString()',
                '  @MinLength(6)',
                '  code!: string;',
                '}',
                '',
                'export class TwoFactorDisableDto {',
                '  @ApiProperty()',
                '  @IsString()',
                '  @MinLength(6)',
                '  password!: string;',
                '}',
                '',
                'export class TwoFactorVerifyLoginDto {',
                '  @ApiProperty()',
                '  @IsString()',
                '  @MinLength(20)',
                '  totpToken!: string;',
                '',
                "  @ApiProperty({ example: '123456' })",
                '  @IsString()',
                '  @MinLength(6)',
                '  code!: string;',
                '}',
                '',
            ].join('\n'),
        });
    } else {
        console.log('[SKIP] F6: TwoFactorVerifyLoginDto از قبل موجود است');
        skipCount++;
    }
}

// ══════════════════════════════════════════════════════════
// FIX 7 — reset-admin.mjs بدون رمز hardcoded
// ══════════════════════════════════════════════════════════
writeNewFile({
    label: 'F7: harden reset-admin.mjs (no hardcoded password)',
    relPath: 'backend/prisma/reset-admin.mjs',
    overwrite: true,
    content: [
        "import { PrismaClient } from '@prisma/client';",
        "import bcrypt from 'bcrypt';",
        "import { randomInt } from 'node:crypto';",
        '',
        'const prisma = new PrismaClient();',
        '',
        'function generatePassword() {',
        "  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*'];",
        "  const all = sets.join('');",
        '  const chars = sets.map((s) => s[randomInt(s.length)]);',
        '  while (chars.length < 16) chars.push(all[randomInt(all.length)]);',
        '  for (let i = chars.length - 1; i > 0; i--) {',
        '    const j = randomInt(i + 1);',
        '    [chars[i], chars[j]] = [chars[j], chars[i]];',
        '  }',
        "  return chars.join('');",
        '}',
        '',
        'async function main() {',
        "  console.log('═══ بازسازی admin ═══\\n');",
        '',
        "  let adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });",
        '  if (!adminRole) {',
        '    adminRole = await prisma.role.create({',
        "      data: { code: 'admin', displayName: 'مدیر سیستم', description: 'دسترسی کامل', isSystem: true },",
        '    });',
        "    console.log('✓ نقش admin ساخته شد');",
        '  } else {',
        "    console.log('ℹ نقش admin موجود');",
        '  }',
        '',
        '  const generated = !process.env.ADMIN_PASSWORD;',
        '  const password = process.env.ADMIN_PASSWORD || generatePassword();',
        '  const hash = await bcrypt.hash(password, 12);',
        '',
        "  let admin = await prisma.user.findUnique({ where: { username: 'admin' } });",
        '  if (admin) {',
        '    await prisma.user.update({',
        '      where: { id: admin.id },',
        '      data: {',
        '        passwordHash: hash,',
        '        isActive: true,',
        '        mustChangePassword: true,',
        '        failedLoginAttempts: 0,',
        '        lockedUntil: null,',
        '      },',
        '    });',
        "    console.log('✓ رمز admin بازنشانی شد');",
        '  } else {',
        '    admin = await prisma.user.create({',
        '      data: {',
        "        username: 'admin',",
        '        passwordHash: hash,',
        "        fullName: 'مدیر سیستم',",
        "        email: 'admin@epsay.local',",
        '        isActive: true,',
        '        mustChangePassword: true,',
        '      },',
        '    });',
        "    console.log('✓ کاربر admin ساخته شد');",
        '  }',
        '',
        '  const link = await prisma.userRole.findFirst({',
        '    where: { userId: admin.id, roleId: adminRole.id },',
        '  });',
        '  if (!link) {',
        '    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });',
        "    console.log('✓ نقش متصل شد');",
        '  }',
        '',
        '  const perms = await prisma.permission.count();',
        '  const rolePerms = await prisma.rolePermission.count({ where: { roleId: adminRole.id } });',
        "  console.log('\\nمجوز کل: ' + perms + ' | برای admin: ' + rolePerms);",
        "  console.log('\\n═══════════════════════════════════════');",
        "  console.log('  کاربر: admin');",
        '  console.log(generated',
        "    ? '  رمز موقت: ' + password + '  (در اولین ورود باید تغییر کند)'",
        "    : '  رمز: مقدار ADMIN_PASSWORD (در اولین ورود باید تغییر کند)');",
        "  console.log('═══════════════════════════════════════');",
        '}',
        '',
        'main()',
        "  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })",
        '  .finally(() => prisma.$disconnect());',
        '',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 8 — حذف رمزهای hardcoded از اسکریپت‌های کمکی
// ══════════════════════════════════════════════════════════
const plainPasswordScripts = [
    'backend/scripts/check-password.js',
    'backend/scripts/reset-password.js',
    'backend/scripts/reset-admin-password.js',
];
for (const rel of plainPasswordScripts) {
    applyFix({
        label: `F8: empty NEW_PASSWORD default in ${rel.split('/').pop()}`,
        relPath: rel,
        search: "const NEW_PASSWORD = process.env.NEW_PASSWORD || 'Admin@1404';",
        replace: "const NEW_PASSWORD = process.env.NEW_PASSWORD || '';",
    });
}

applyFix({
    label: 'F8: diag-login.js uses ADMIN_PASS env',
    relPath: 'backend/scripts/diag-login.js',
    search: [
        "  { username: 'admin', password: 'Admin@1404' },",
        "  { email:    'admin', password: 'Admin@1404' },",
    ].join('\n'),
    replace: [
        "  { username: 'admin', password: process.env.ADMIN_PASS || '' },",
        "  { email:    'admin', password: process.env.ADMIN_PASS || '' },",
    ].join('\n'),
});

// test-*.js و test-real-system.mjs: تغییر به env
for (const rel of [
    'backend/scripts/test-bank-hook.js',
    'backend/scripts/test-fixed-assets.js',
    'backend/scripts/test-purchase.js',
    'backend/scripts/test-sales.js',
    'test-real-system.mjs',
]) {
    applyFix({
        label: `F8: ADMIN_PASSWORD env in ${rel.split('/').pop()}`,
        relPath: rel,
        search: "password: 'Admin@1404',",
        replace: "password: process.env.ADMIN_PASSWORD || 'Admin@1404',",
    });
}

// ══════════════════════════════════════════════════════════
// FIX 9 — Decimal در postMultiLine
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F9: Decimal sum in postMultiLine',
    relPath: 'backend/src/modules/accounting/engine/accounting-engine.service.ts',
    search: [
        '    let totalDebit = 0;',
        '    let totalCredit = 0;',
        '    for (const l of payload.lines) {',
        '      totalDebit += Number(l.debit || 0);',
        '      totalCredit += Number(l.credit || 0);',
        '    }',
        '    if (Math.abs(totalDebit - totalCredit) > 0.01) {',
        '      throw new BadRequestException(',
        "        'سند تراز نیست: Dr=' + totalDebit + ' Cr=' + totalCredit,",
        '      );',
        '    }',
    ].join('\n'),
    replace: [
        '    // استفاده از Decimal برای دقت مالی کامل (float drift حذف می‌شود)',
        '    let totalDebit = new Prisma.Decimal(0);',
        '    let totalCredit = new Prisma.Decimal(0);',
        '    for (const l of payload.lines) {',
        '      totalDebit = totalDebit.plus(new Prisma.Decimal(l.debit ?? 0));',
        '      totalCredit = totalCredit.plus(new Prisma.Decimal(l.credit ?? 0));',
        '    }',
        '    if (!totalDebit.toDP(2).equals(totalCredit.toDP(2))) {',
        '      throw new BadRequestException(',
        "        'سند تراز نیست: Dr=' + totalDebit.toFixed(2) + ' Cr=' + totalCredit.toFixed(2),",
        '      );',
        '    }',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 10 — fiscal-years close(): don't wipe other years isCurrent
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F10: fiscal close does not touch other isCurrent',
    relPath: 'backend/src/modules/accounting/fiscal-years.service.ts',
    search: [
        '    // FIX #27: فقط خودِ این سال را می‌بندیم — isCurrent سایر سال‌ها دست‌نخورده می‌ماند.',
        '    // قبلاً updateMany({where:{isCurrent:true}}) پرچم سال جاری را از بین می‌برد.',
        '    return this.prisma.fiscalYear.update({',
        "      where: { id },",
        "      data: { status: 'CLOSED', isCurrent: false },",
        '    });',
    ].join('\n'),
    replace: [
        '    // ⚠️ فقط این سال بسته می‌شود؛ isCurrent سایر سال‌ها دست‌نخورده.',
        '    // قبلاً updateMany({where:{isCurrent:true}}) پرچم سال جاری را پاک می‌کرد.',
        '    return this.prisma.fiscalYear.update({',
        '      where: { id },',
        "      data: { status: 'CLOSED', isCurrent: false },",
        '    });',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 11 — journals.create: date within fiscal year
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F11: create() validates entryDate in fiscal year',
    relPath: 'backend/src/modules/accounting/journals.service.ts',
    search: [
        '    const entryDate = new Date(dto.entryDate);',
        '    await this.ensureFiscalYearOpen(dto.fiscalYearId, entryDate);',
    ].join('\n'),
    replace: [
        '    const entryDate = new Date(dto.entryDate);',
        '    // تاریخ سند باید در بازهٔ سال مالی باشد',
        '    const fyMeta = await this.prisma.fiscalYear.findUnique({',
        '      where: { id: dto.fiscalYearId },',
        '      select: { startDate: true, endDate: true, name: true },',
        '    });',
        "    if (!fyMeta) throw new NotFoundException('سال مالی یافت نشد');",
        '    if (entryDate < new Date(fyMeta.startDate) || entryDate > new Date(fyMeta.endDate)) {',
        '      throw new BadRequestException(',
        "        'تاریخ سند (' + dto.entryDate + ') در محدوده سال مالی «' + fyMeta.name + '» نیست',",
        '      );',
        '    }',
        '    await this.ensureFiscalYearOpen(dto.fiscalYearId, entryDate);',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 12 — subcontractor-statement rollback on JE failure
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F12: subcontractor approve rolls back on JE failure',
    relPath: 'backend/src/modules/payroll/subcontractor-statements.service.ts',
    search: [
        '    try {',
        '      journal = await this.createApprovalJE(id, userId);',
        '    } catch (e: any) {',
        '      this.prisma.$executeRawUnsafe(',
    ].join('\n'),
    replace: [
        '    try {',
        '      journal = await this.createApprovalJE(id, userId);',
        '    } catch (e: any) {',
        '      // ROLLBACK: تأییدشده بدون سند نباید باقی بماند',
        '      await this.prisma.subcontractorStatement.update({',
        '        where: { id },',
        "        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },",
        '      }).catch(() => {});',
        '      this.prisma.$executeRawUnsafe(',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 13 — worker-statement rollback on JE failure
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F13: worker approve rolls back on JE failure',
    relPath: 'backend/src/modules/payroll/worker-statements.service.ts',
    search: [
        '    try {',
        '      journal = await this.createApprovalJE(id, userId);',
        '    } catch (e: any) {',
        "      console.error('[WorkerStatement] JE failed:', e?.message);",
        '    }',
    ].join('\n'),
    replace: [
        '    try {',
        '      journal = await this.createApprovalJE(id, userId);',
        '    } catch (e: any) {',
        '      // ROLLBACK: تأیید بدون سند نباید باقی بماند',
        '      await this.prisma.workerStatement.update({',
        '        where: { id },',
        "        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },",
        '      }).catch(() => {});',
        '      throw new BadRequestException(',
        "        'تأیید انجام نشد چون ثبت سند حسابداری ناموفق بود: ' + (e?.message || 'خطای نامشخص'),",
        '      );',
        '    }',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 14 — forwarder: any failure → FAILED
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F14: forwarder status = FAILED on any failure',
    relPath: 'backend/src/modules/site-ops/daily-report-forwarder.service.ts',
    search: "        status: failed > 0 && success === 0 ? 'FAILED' : 'FORWARDED',",
    replace: [
        '        // هر ردیف ناموفق یعنی بخش کامل نشده؛ در غیر این‌صورت',
        '        // در صندوق «ارسال‌های ناموفق» دیده نمی‌شد',
        "        status: failed > 0 ? 'FAILED' : 'FORWARDED',",
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 15 — trust proxy
// ══════════════════════════════════════════════════════════
applyFix({
    label: 'F15: trust proxy for reverse-proxy deployment',
    relPath: 'backend/src/main.ts',
    search: '  app.use(cookieParser());',
    replace: [
        '  // پشت reverse proxy (IIS/nginx) برای IP واقعی در rate-limit و audit',
        '  if (process.env.TRUST_PROXY) {',
        '    const raw = process.env.TRUST_PROXY;',
        "    app.set('trust proxy', /^\\d+$/.test(raw) ? Number(raw) : raw);",
        '  }',
        '',
        '  app.use(cookieParser());',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// FIX 16 — .env.example: security vars
// ══════════════════════════════════════════════════════════
{
    const envPath = path.join(ROOT, 'backend/.env.example');
    if (!fs.existsSync(envPath)) {
        console.log('[SKIP] F16: backend/.env.example not found');
        skipCount++;
    } else {
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('ALLOWED_ORIGINS')) {
            console.log('[SKIP] F16: ALLOWED_ORIGINS already present');
            skipCount++;
        } else if (DRY) {
            console.log('[DRY]  F16: would append security vars');
            okCount++;
        } else {
            const addition = [
                '',
                '# ── امنیت / استقرار (قبل از تحویل حتماً مقداردهی شود) ──',
                'ALLOWED_ORIGINS=https://your-frontend-domain.example',
                'TRUST_PROXY=1',
                'PROJECT_SCOPE_ENABLED=true',
                'CONFIG_ENCRYPTION_KEY=CHANGE_ME',
                'BACKUP_ENCRYPTION_KEY=CHANGE_ME',
                '# ADMIN_PASSWORD=',
                '',
            ].join('\n');
            fs.copyFileSync(envPath, `${envPath}.bak-${TS}`);
            fs.writeFileSync(envPath, content.trimEnd() + addition, 'utf8');
            console.log('[OK]   F16: .env.example updated');
            okCount++;
        }
    }
}

// ══════════════════════════════════════════════════════════
// FIX 17 — CI: add prisma migrate deploy
// ══════════════════════════════════════════════════════════
{
    const ciPath = path.join(ROOT, '.github/workflows/ci.yml');
    if (!fs.existsSync(ciPath)) {
        console.log('[SKIP] F17: ci.yml not found');
        skipCount++;
    } else {
        const content = fs.readFileSync(ciPath, 'utf8');
        if (content.includes('prisma migrate deploy')) {
            console.log('[SKIP] F17: prisma migrate deploy already in CI');
            skipCount++;
        } else {
            const anchor = '      - run: npx prisma generate';
            if (!content.includes(anchor)) {
                console.log('[SKIP] F17: anchor not found in ci.yml');
                skipCount++;
            } else if (DRY) {
                console.log('[DRY]  F17: would add migrate step');
                okCount++;
            } else {
                const replacement = anchor + '\n      - run: npx prisma migrate deploy';
                fs.copyFileSync(ciPath, `${ciPath}.bak-${TS}`);
                fs.writeFileSync(ciPath, content.replace(anchor, replacement), 'utf8');
                console.log('[OK]   F17: migrate step added to CI');
                okCount++;
            }
        }
    }
}

// ══════════════════════════════════════════════════════════
// FIX 18 — spec files
// ══════════════════════════════════════════════════════════
writeNewFile({
    label: 'F18a: two-factor.verify.spec.ts',
    relPath: 'backend/src/modules/auth/two-factor.verify.spec.ts',
    content: [
        "import { TwoFactorService } from './two-factor.service';",
        "import * as otplib from 'otplib';",
        '',
        "jest.mock('otplib', () => ({",
        '  authenticator: {',
        '    verify: jest.fn(),',
        "    generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),",
        "    keyuri: jest.fn().mockReturnValue('otpauth://totp/test'),",
        '  },',
        '}));',
        '',
        '// باگ حیاتی: در بعضی نسخه‌های otplib خروجی verify شیء { valid: false } است؛',
        '// !!r روی شیء همیشه true است و 2FA را کامل دور می‌زند.',
        "describe('TwoFactorService.verifyCode', () => {",
        "  const svc = new TwoFactorService({ get: () => 'x'.repeat(40) } as any);",
        '  const verify = (otplib as any).authenticator.verify as jest.Mock;',
        '',
        "  it('{ valid:false } باید رد شود', async () => {",
        '    verify.mockReturnValue({ valid: false });',
        "    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);",
        '  });',
        "  it('{ valid:true } باید پذیرفته شود', async () => {",
        '    verify.mockReturnValue({ valid: true, delta: 0 });',
        "    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);",
        '  });',
        "  it('boolean false/true هم درست کار می‌کند', async () => {",
        '    verify.mockReturnValue(false);',
        "    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);",
        '    verify.mockReturnValue(true);',
        "    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);",
        '  });',
        '});',
        '',
    ].join('\n'),
});

writeNewFile({
    label: 'F18b: auth.controller.spec.ts',
    relPath: 'backend/src/modules/auth/auth.controller.spec.ts',
    content: [
        "import { AuthController } from './auth.controller';",
        '',
        "describe('AuthController (Contract)', () => {",
        '  let controller: AuthController;',
        '  let authService: any;',
        '',
        '  beforeEach(() => {',
        '    authService = {',
        '      changePassword: jest.fn().mockResolvedValue({ success: true }),',
        "      verify2FALogin: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),",
        '      updatePreferences: jest.fn().mockResolvedValue({}),',
        '    };',
        '    controller = new AuthController(authService);',
        '  });',
        '',
        "  it('changePassword باید oldPassword و newPassword را جدا بفرستد', async () => {",
        "    const dto = { oldPassword: 'old-pass-1234', newPassword: 'New-Strong-Pass@1404' } as any;",
        "    await controller.changePassword({ id: 'u1' } as any, dto);",
        "    expect(authService.changePassword).toHaveBeenCalledWith('u1', 'old-pass-1234', 'New-Strong-Pass@1404');",
        '  });',
        '',
        "  it('verify2FA اندپوینت 2FA را صدا می‌زند', async () => {",
        "    const dto = { totpToken: 'pending-jwt', code: '123456' };",
        '    await controller.verify2FALogin(dto, {} as any);',
        "    expect(authService.verify2FALogin).toHaveBeenCalledWith('pending-jwt', '123456', expect.any(Object));",
        '  });',
        '});',
        '',
    ].join('\n'),
});

// ══════════════════════════════════════════════════════════
// Build
// ══════════════════════════════════════════════════════════
if (!DRY && !NO_BUILD && okCount > 0) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Building backend...');
    console.log('═══════════════════════════════════════════════════════');
    const buildRes = spawnSync('npm', ['run', 'build'], {
        cwd: path.join(ROOT, 'backend'),
        stdio: 'inherit',
        shell: true,
    });
    if (buildRes.status !== 0) {
        console.log('');
        console.log('❌ build failed — see errors above');
        process.exit(1);
    }
    console.log('');
    console.log('✅ build succeeded');
}

// ══════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`  ✅ OK    : ${okCount}`);
console.log(`  ⊘  SKIP  : ${skipCount}`);
console.log(`  ❌ FAIL  : ${failCount}`);
console.log(`  🕒 Backup: *.bak-${TS}`);
console.log('═══════════════════════════════════════════════════════');
console.log('');
if (failCount > 0) process.exit(1);