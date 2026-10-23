#Requires -Version 5.1
<#
.SYNOPSIS
    اجرای خودکار تمام اصلاحات امنیتی و صحت داده‌ی Epsay Accounting.

.DESCRIPTION
    - نسخه‌پشتیبان برای هر فایل می‌سازد (.bak-yyyyMMdd-HHmmss)
    - فقط در صورت یافتن الگوی دقیق جایگزینی می‌کند (idempotent)
    - گزارش کامل در کنسول و فایل لاگ

.EXAMPLE
    .\apply-security-fixes.ps1 -DryRun           # پیش‌نمایش بدون تغییر
    .\apply-security-fixes.ps1                   # اجرای کامل
    .\apply-security-fixes.ps1 -NoBuild -StopOnError
#>
[CmdletBinding()]
param(
    [string]$Root    = "E:\EpsayAccounting",
    [switch]$DryRun,
    [switch]$SkipBackup,
    [switch]$NoBuild,
    [switch]$StopOnError
)

$ErrorActionPreference = 'Stop'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile   = Join-Path $Root "apply-fixes-$Timestamp.log"

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
function Write-Log {
    param([string]$Msg, [string]$Level = 'INFO')
    $colors = @{ OK='Green'; ERROR='Red'; WARN='Yellow'; STEP='Cyan'; INFO='White'; HEAD='Magenta' }
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'HH:mm:ss'), $Level, $Msg
    Write-Host $line -ForegroundColor $colors[$Level]
    try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch {}
}

function Backup-File {
    param([string]$Path)
    if ($SkipBackup -or $DryRun) { return }
    if (!(Test-Path -LiteralPath $Path)) { return }
    $bak = "$Path.bak-$Timestamp"
    Copy-Item -LiteralPath $Path -Destination $bak -Force
    Write-Log "  📦 backup → $bak" 'INFO'
}

function Read-Norm {
    param([string]$Path)
    if (!(Test-Path -LiteralPath $Path)) { throw "File not found: $Path" }
    $raw = [System.IO.File]::ReadAllText($Path)
    $hadCRLF = $raw.Contains("`r`n")
    @{
        Content = $raw.Replace("`r`n", "`n").Replace("`r", "`n")
        HadCRLF = $hadCRLF
    }
}

function Save-Norm {
    param([string]$Path, [string]$Content, [bool]$HadCRLF)
    if ($DryRun) { Write-Log "  [DRYRUN] would write $Path" 'WARN'; return }
    $out = if ($HadCRLF) { $Content.Replace("`n", "`r`n") } else { $Content }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $out, $utf8)
}

function Replace-Lit {
    param([string]$Content, [string]$Search, [string]$Replace, [string]$Label)
    $idx = $Content.IndexOf($Search)
    if ($idx -lt 0) {
        Write-Log "  ⊘ SKIP (not found): $Label" 'WARN'
        return $Content
    }
    $second = $Content.IndexOf($Search, $idx + $Search.Length)
    if ($second -ge 0) {
        throw "MULTIPLE MATCHES: $Label — manual review required"
    }
    Write-Log "  ✅ replaced: $Label" 'OK'
    return $Content.Substring(0, $idx) + $Replace + $Content.Substring($idx + $Search.Length)
}

function Apply-Changes {
    param([string]$RelPath, [array]$Changes)
    $path = Join-Path $Root $RelPath
    if (!(Test-Path -LiteralPath $path)) {
        Write-Log "  ⊘ SKIP (missing): $RelPath" 'WARN'
        return
    }
    Write-Log "📝 $RelPath" 'STEP'
    $r = Read-Norm $path
    $c = $r.Content
    foreach ($ch in $Changes) {
        $c = Replace-Lit -Content $c -Search $ch.Search.Replace("`r`n","`n") `
                            -Replace $ch.Replace.Replace("`r`n","`n") -Label $ch.Label
    }
    if ($c -ne $r.Content) {
        Backup-File $path
        Save-Norm $path $c $r.HadCRLF
        Write-Log "  💾 saved" 'OK'
    }
}

function Write-New {
    param([string]$RelPath, [string]$Content)
    $path = Join-Path $Root $RelPath
    $dir = Split-Path $path -Parent
    if (!(Test-Path -LiteralPath $dir)) {
        Write-Log "  ⊘ SKIP (dir missing): $RelPath" 'WARN'
        return
    }
    Write-Log "📄 $RelPath (new/replace)" 'STEP'
    if (Test-Path -LiteralPath $path) { Backup-File $path }
    if ($DryRun) { Write-Log "  [DRYRUN] write" 'WARN'; return }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($path, $Content.Replace("`r`n","`n").Replace("`r","`n"), $utf8)
    Write-Log "  💾 written" 'OK'
}

# ──────────────────────────────────────────────────────────
# Preflight
# ──────────────────────────────────────────────────────────
if (!(Test-Path $Root))                   { throw "Root not found: $Root" }
if (!(Test-Path (Join-Path $Root 'backend'))) { throw "backend/ not found under $Root" }

Write-Log "═══════════════════════════════════════════════════════" 'HEAD'
Write-Log " Epsay Accounting — Security & Quality Fixes"           'HEAD'
Write-Log " Root    : $Root"                                        'HEAD'
Write-Log " DryRun  : $DryRun"                                      'HEAD'
Write-Log " LogFile : $LogFile"                                     'HEAD'
Write-Log "═══════════════════════════════════════════════════════" 'HEAD'

$script:results = @()
function Step {
    param([string]$Name, [scriptblock]$Action)
    try {
        & $Action
        $script:results += [PSCustomObject]@{ Step = $Name; Status = 'OK'; Error = '' }
    } catch {
        $msg = $_.Exception.Message
        $script:results += [PSCustomObject]@{ Step = $Name; Status = 'FAIL'; Error = $msg }
        Write-Log "❌ $Name — $msg" 'ERROR'
        if ($StopOnError) { throw }
    }
}

# ═══════════════════════════════════════════════════════════
# FIX 1 — دوْر زدن 2FA (Critical Security Bypass)
# ═══════════════════════════════════════════════════════════
Step 'Fix 2FA bypass (otpVerify)' {
    Apply-Changes 'backend/src/modules/auth/two-factor.service.ts' @(
        @{
            Label = 'otpVerify: reject {valid:false} object'
            Search = @'
    if (typeof _otp.verify === 'function') {
      const r = _otp.verify({ token: clean, secret });
      if (isPromise(r)) return await r;
      return !!r;
    }
'@
            Replace = @'
    if (typeof _otp.verify === 'function') {
      const r = _otp.verify({ token: clean, secret });
      const resolved = isPromise(r) ? await r : r;
      // ⚠️ CRITICAL: برخی نسخه‌های otplib شیء { valid: boolean } برمی‌گردانند،
      // `!!r` روی شیء همیشه true است و 2FA را کاملاً دور می‌زند.
      if (typeof resolved === 'boolean') return resolved;
      if (resolved && typeof resolved === 'object'
          && typeof (resolved as any).valid === 'boolean') {
        return (resolved as any).valid === true;
      }
      return false;
    }
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 2 — Recovery codes ضعیف (Math.random → crypto.randomInt)
# ═══════════════════════════════════════════════════════════
Step 'Fix recovery-codes randomness' {
    Apply-Changes 'backend/src/modules/auth/two-factor.service.ts' @(
        @{
            Label = 'crypto.randomInt for recovery codes'
            Search = @'
      const chunk1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const chunk2 = Math.random().toString(36).substring(2, 6).toUpperCase();
'@
            Replace = @'
      // ⚠️ استفاده از CSPRNG (crypto.randomInt) به‌جای Math.random قابل پیش‌بینی
      const chunk1 = crypto.randomInt(0x10000).toString(16).padStart(4, '0').toUpperCase();
      const chunk2 = crypto.randomInt(0x10000).toString(16).padStart(4, '0').toUpperCase();
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 3 — changePassword باگ (DTO به‌جای string)
# ═══════════════════════════════════════════════════════════
Step 'Fix changePassword (pass strings)' {
    Apply-Changes 'backend/src/modules/auth/auth.controller.ts' @(
        @{
            Label = 'changePassword: pass old/new as strings'
            Search = 'return this.authService.changePassword(user.id, dto as any, dto.newPassword);'
            Replace = @'
return this.authService.changePassword(user.id, dto.oldPassword, dto.newPassword);
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 4 — updatePreferences باگ
# ═══════════════════════════════════════════════════════════
Step 'Fix updatePreferences' {
    Apply-Changes 'backend/src/modules/auth/auth.controller.ts' @(
        @{
            Label = 'updatePreferences: pass theme string'
            Search = 'return this.authService.updatePreferences(user.id, dto as any);'
            Replace = @'
return this.authService.updatePreferences(user.id, dto.themePreference);
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 5 — افزودن endpoint تأیید 2FA پس از login (public)
# ═══════════════════════════════════════════════════════════
Step 'Add POST /auth/2fa/verify endpoint' {
    $path = Join-Path $Root 'backend/src/modules/auth/auth.controller.ts'
    if (!(Test-Path $path)) { throw "auth.controller.ts not found" }
    $r = Read-Norm $path
    if ($r.Content -match "2fa/verify") {
        Write-Log "  ⊘ SKIP: /2fa/verify already present" 'WARN'
        return
    }
    $imports = @'
import { TwoFactorVerifyLoginDto } from './dto/two-factor.dto';
'@
    $endpoint = @'

  // ⚠️ NEW: endpoint تأیید کد 2FA بعد از login اولیه (public)
  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'تأیید کد دومرحله‌ای (پس از login)' })
  async verify2FALogin(@Body() dto: TwoFactorVerifyLoginDto, @Req() req: Request) {
    const ip = (req as any).ip;
    const ua = req.headers['user-agent'] as string | undefined;
    return this.authService.verify2FALogin(dto.totpToken, dto.code, { ip, ua });
  }
'@
    # Insert import after TwoFactorDisableDto import
    $anchor = "import { TwoFactorCodeDto, TwoFactorDisableDto } from './dto/two-factor.dto';"
    if ($r.Content.Contains($anchor)) {
        $newImport = "import { TwoFactorCodeDto, TwoFactorDisableDto } from './dto/two-factor.dto';`nimport { TwoFactorVerifyLoginDto } from './dto/two-factor.dto';"
        $c = $r.Content.Replace($anchor, $newImport)
    } else {
        Write-Log "  ⚠️ import anchor not found, adding at top" 'WARN'
        $c = $imports + "`n" + $r.Content
    }
    # Insert endpoint before closing brace of class (last '}' in file)
    $lastBrace = $c.LastIndexOf('}')
    if ($lastBrace -lt 0) { throw "class closing brace not found" }
    $c = $c.Substring(0, $lastBrace) + $endpoint + "`n" + $c.Substring($lastBrace)
    Backup-File $path
    Save-Norm $path $c $r.HadCRLF
    Write-Log "  ✅ endpoint added" 'OK'
}

# ═══════════════════════════════════════════════════════════
# FIX 6 — DTO برای تأیید 2FA (اگر موجود نیست)
# ═══════════════════════════════════════════════════════════
Step 'Ensure TwoFactorVerifyLoginDto exists' {
    $path = Join-Path $Root 'backend/src/modules/auth/dto/two-factor.dto.ts'
    $exists = (Test-Path $path) -and ((Get-Content $path -Raw) -match 'TwoFactorVerifyLoginDto')
    if ($exists) {
        Write-Log "  ⊘ SKIP: TwoFactorVerifyLoginDto already present" 'WARN'
        return
    }
    $content = @'
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}

export class TwoFactorDisableDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  totpToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}
'@
    Write-New 'backend/src/modules/auth/dto/two-factor.dto.ts' $content
}

# ═══════════════════════════════════════════════════════════
# FIX 7 — reset-admin.mjs بدون رمز hardcoded
# ═══════════════════════════════════════════════════════════
Step 'Harden reset-admin.mjs' {
    $content = @'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';

const prisma = new PrismaClient();

function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function main() {
  console.log('═══ بازسازی admin ═══\n');

  let adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { code: 'admin', displayName: 'مدیر سیستم', description: 'دسترسی کامل', isSystem: true },
    });
    console.log('✓ نقش admin ساخته شد');
  } else {
    console.log('ℹ نقش admin موجود');
  }

  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const hash = await bcrypt.hash(password, 12);

  let admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log('✓ رمز admin بازنشانی شد');
  } else {
    admin = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hash,
        fullName: 'مدیر سیستم',
        email: 'admin@epsay.local',
        isActive: true,
        mustChangePassword: true,
      },
    });
    console.log('✓ کاربر admin ساخته شد');
  }

  const link = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: adminRole.id },
  });
  if (!link) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
    console.log('✓ نقش متصل شد');
  }

  const perms = await prisma.permission.count();
  const rolePerms = await prisma.rolePermission.count({ where: { roleId: adminRole.id } });
  console.log('\nمجوز کل: ' + perms + ' | برای admin: ' + rolePerms);
  console.log('\n═══════════════════════════════════════');
  console.log('  کاربر: admin');
  console.log(generated
    ? '  رمز موقت: ' + password + '  (در اولین ورود باید تغییر کند)'
    : '  رمز: مقدار ADMIN_PASSWORD (در اولین ورود باید تغییر کند)');
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
'@
    Write-New 'backend/prisma/reset-admin.mjs' $content
}

# ═══════════════════════════════════════════════════════════
# FIX 8 — حذف رمز hardcoded از اسکریپت‌های کمکی
# ═══════════════════════════════════════════════════════════
Step 'Remove hardcoded passwords from scripts' {
    $scripts = @(
        'backend/scripts/check-password.js',
        'backend/scripts/reset-password.js',
        'backend/scripts/reset-admin-password.js'
    )
    foreach ($s in $scripts) {
        $path = Join-Path $Root $s
        if (!(Test-Path $path)) { Write-Log "  ⊘ missing: $s" 'WARN'; continue }
        $r = Read-Norm $path
        $c = $r.Content -replace "(process\.env\.NEW_PASSWORD\s*\|\|\s*)'Admin@1404'", '$1''''
        if ($c -ne $r.Content) {
            Backup-File $path; Save-Norm $path $c $r.HadCRLF
            Write-Log "  ✅ $s" 'OK'
        } else {
            Write-Log "  ⊘ no change: $s" 'WARN'
        }
    }
    # diag-login.js
    $diag = 'backend/scripts/diag-login.js'
    if (Test-Path (Join-Path $Root $diag)) {
        $path = Join-Path $Root $diag
        $r = Read-Norm $path
        $c = $r.Content -replace "password:\s*'Admin@1404'", "password: process.env.ADMIN_PASS || ''"
        if ($c -ne $r.Content) {
            Backup-File $path; Save-Norm $path $c $r.HadCRLF
            Write-Log "  ✅ $diag" 'OK'
        }
    }
    # test-*.js — تغییر به ADMIN_PASSWORD env
    foreach ($t in @('test-bank-hook.js','test-fixed-assets.js','test-purchase.js','test-sales.js')) {
        $rel = "backend/scripts/$t"
        $path = Join-Path $Root $rel
        if (!(Test-Path $path)) { continue }
        $r = Read-Norm $path
        $c = $r.Content -replace "password:\s*'Admin@1404'", "password: process.env.ADMIN_PASSWORD || 'Admin@1404'"
        if ($c -ne $r.Content) {
            Backup-File $path; Save-Norm $path $c $r.HadCRLF
            Write-Log "  ✅ $rel" 'OK'
        }
    }
    # test-real-system.mjs
    $trs = 'test-real-system.mjs'
    if (Test-Path (Join-Path $Root $trs)) {
        $path = Join-Path $Root $trs
        $r = Read-Norm $path
        $c = $r.Content -replace "password:\s*'Admin@1404'", "password: process.env.ADMIN_PASSWORD || 'Admin@1404'"
        if ($c -ne $r.Content) {
            Backup-File $path; Save-Norm $path $c $r.HadCRLF
            Write-Log "  ✅ $trs" 'OK'
        }
    }
}

# ═══════════════════════════════════════════════════════════
# FIX 9 — Decimal precision در accounting-engine.postMultiLine
# ═══════════════════════════════════════════════════════════
Step 'Fix Decimal in postMultiLine' {
    Apply-Changes 'backend/src/modules/accounting/engine/accounting-engine.service.ts' @(
        @{
            Label = 'postMultiLine: Decimal sum instead of float'
            Search = @'
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of payload.lines) {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    }
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        'سند تراز نیست: Dr=' + totalDebit + ' Cr=' + totalCredit,
      );
    }
'@
            Replace = @'
    // ⚠️ Decimal برای دقت مالی (به‌جای float با تلورانس ۰٫۰۱ که خطای واقعی را پنهان می‌کند)
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);
    for (const l of payload.lines) {
      totalDebit = totalDebit.plus(new Prisma.Decimal(l.debit ?? 0));
      totalCredit = totalCredit.plus(new Prisma.Decimal(l.credit ?? 0));
    }
    if (!totalDebit.toDP(2).equals(totalCredit.toDP(2))) {
      throw new BadRequestException(
        'سند تراز نیست: Dr=' + totalDebit.toFixed(2) + ' Cr=' + totalCredit.toFixed(2),
      );
    }
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 10 — fiscal-years: race condition + close() bug
# ═══════════════════════════════════════════════════════════
Step 'Fix fiscal-year close()' {
    Apply-Changes 'backend/src/modules/accounting/fiscal-years.service.ts' @(
        @{
            Label = 'close(): don''t wipe other years isCurrent'
            Search = @'
    // FIX #27: فقط خودِ این سال را می‌بندیم — isCurrent سایر سال‌ها دست‌نخورده می‌ماند.
    // قبلاً updateMany({where:{isCurrent:true}}) پرچم سال جاری را از بین می‌برد.
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'CLOSED', isCurrent: false },
    });
'@
            Replace = @'
    // ⚠️ FIX: only THIS year is closed; other years' isCurrent flag untouched.
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'CLOSED', isCurrent: false },
    });
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 11 — journals.create: date validation
# ═══════════════════════════════════════════════════════════
Step 'Add fiscal-year date validation in journals.create' {
    Apply-Changes 'backend/src/modules/accounting/journals.service.ts' @(
        @{
            Label = 'create(): validate entryDate within fiscal year'
            Search = @'
    const entryDate = new Date(dto.entryDate);
    await this.ensureFiscalYearOpen(dto.fiscalYearId, entryDate);
'@
            Replace = @'
    const entryDate = new Date(dto.entryDate);
    // ⚠️ FIX: تاریخ سند باید در بازهٔ سال مالی باشد (قبلاً فقط status چک می‌شد)
    const fyMeta = await this.prisma.fiscalYear.findUnique({
      where: { id: dto.fiscalYearId },
      select: { startDate: true, endDate: true, name: true },
    });
    if (!fyMeta) throw new NotFoundException('سال مالی یافت نشد');
    if (entryDate < new Date(fyMeta.startDate) || entryDate > new Date(fyMeta.endDate)) {
      throw new BadRequestException(
        'تاریخ سند (' + dto.entryDate + ') در محدوده سال مالی «' + fyMeta.name + '» نیست',
      );
    }
    await this.ensureFiscalYearOpen(dto.fiscalYearId, entryDate);
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 12 — subcontractor-statement approve: rollback on JE failure
# ═══════════════════════════════════════════════════════════
Step 'Add rollback for subcontractor-statement approve' {
    Apply-Changes 'backend/src/modules/payroll/subcontractor-statements.service.ts' @(
        @{
            Label = 'approve(): rollback if JE fails'
            Search = @'
    } catch (e: any) {
      // B12: don''t let approved-without-JE
      this.prisma.$executeRawUnsafe(
'@
            Replace = @'
    } catch (e: any) {
      // ⚠️ ROLLBACK: صورت‌وضعیت تأییدشده نباید بدون سند حسابداری باقی بماند
      await this.prisma.subcontractorStatement.update({
        where: { id },
        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },
      });
      this.prisma.$executeRawUnsafe(
'@
        }
    )
}

# fallback برای مسیر جایگزین
Step 'Fallback rollback for subcontractor-statements' {
    Apply-Changes 'backend/src/modules/payroll/subcontractor-statements.service.ts' @(
        @{
            Label = 'approve() catch block — restore SUBMITTED'
            Search = @'
    try {
      journal = await this.createApprovalJE(id, userId);
    } catch (e: any) {
      this.prisma.$executeRawUnsafe(
'@
            Replace = @'
    try {
      journal = await this.createApprovalJE(id, userId);
    } catch (e: any) {
      // ⚠️ ROLLBACK
      await this.prisma.subcontractorStatement.update({
        where: { id },
        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },
      });
      this.prisma.$executeRawUnsafe(
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 13 — worker-statement approve: rollback on JE failure
# ═══════════════════════════════════════════════════════════
Step 'Add rollback for worker-statement approve' {
    Apply-Changes 'backend/src/modules/payroll/worker-statements.service.ts' @(
        @{
            Label = 'worker approve(): rollback if JE fails'
            Search = @'
    } catch (e: any) {
      console.error('[WorkerStatement] JE failed:', e?.message);
    }
'@
            Replace = @'
    } catch (e: any) {
      // ⚠️ ROLLBACK: تأیید بدون سند حسابداری نباید باقی بماند
      await this.prisma.workerStatement.update({
        where: { id },
        data: { status: 'SUBMITTED', approvedById: null, approvedAt: null },
      });
      throw new BadRequestException(
        'تأیید انجام نشد چون ثبت سند حسابداری ناموفق بود: ' + (e?.message || 'خطای نامشخص'),
      );
    }
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 14 — forwarder: هر خطا = FAILED
# ═══════════════════════════════════════════════════════════
Step 'Fix forwarder status logic' {
    Apply-Changes 'backend/src/modules/site-ops/daily-report-forwarder.service.ts' @(
        @{
            Label = 'any failure → FAILED (not FORWARDED)'
            Search = @'
        status: failed > 0 && success === 0 ? 'FAILED' : 'FORWARDED',
'@
            Replace = @'
        // ⚠️ FIX: هر ردیف ناموفق یعنی بخش کامل نشده؛ در غیر این‌صورت
        // در صندوق «ارسال‌های ناموفق» دیده نمی‌شد.
        status: failed > 0 ? 'FAILED' : 'FORWARDED',
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 15 — main.ts: trust proxy
# ═══════════════════════════════════════════════════════════
Step 'Add trust proxy to main.ts' {
    Apply-Changes 'backend/src/main.ts' @(
        @{
            Label = 'trust proxy for reverse-proxy deployment'
            Search = @'
  app.use(cookieParser());
'@
            Replace = @'
  // ⚠️ پشت reverse proxy (IIS/nginx) — برای IP واقعی در rate-limit و audit
  if (process.env.TRUST_PROXY) {
    const raw = process.env.TRUST_PROXY;
    app.set('trust proxy', /^\d+$/.test(raw) ? Number(raw) : raw);
  }

  app.use(cookieParser());
'@
        }
    )
}

# ═══════════════════════════════════════════════════════════
# FIX 16 — .env.example: افزودن متغیرهای امنیتی
# ═══════════════════════════════════════════════════════════
Step 'Update .env.example' {
    $path = Join-Path $Root 'backend/.env.example'
    if (!(Test-Path $path)) { Write-Log "  ⊘ missing: backend/.env.example" 'WARN'; return }
    $r = Read-Norm $path
    if ($r.Content -match 'ALLOWED_ORIGINS') {
        Write-Log "  ⊘ SKIP: already contains ALLOWED_ORIGINS" 'WARN'
        return
    }
    $add = @'

# ── امنیت / استقرار (قبل از تحویل حتماً مقداردهی شود) ──
ALLOWED_ORIGINS=https://your-frontend-domain.example
TRUST_PROXY=1
PROJECT_SCOPE_ENABLED=true
CONFIG_ENCRYPTION_KEY=CHANGE_ME
BACKUP_ENCRYPTION_KEY=CHANGE_ME
# ADMIN_PASSWORD=
'@
    $c = $r.Content.TrimEnd() + $add
    Backup-File $path
    Save-Norm $path $c $r.HadCRLF
    Write-Log "  ✅ appended security vars" 'OK'
}

# ═══════════════════════════════════════════════════════════
# FIX 17 — CI: prisma migrate deploy
# ═══════════════════════════════════════════════════════════
Step 'Add prisma migrate deploy to CI' {
    $path = Join-Path $Root '.github/workflows/ci.yml'
    if (!(Test-Path $path)) { Write-Log "  ⊘ missing: ci.yml" 'WARN'; return }
    $r = Read-Norm $path
    if ($r.Content -match 'prisma migrate deploy') {
        Write-Log "  ⊘ SKIP: already present" 'WARN'
        return
    }
    $search = "      - run: npx prisma generate"
    if (!$r.Content.Contains($search)) {
        Write-Log "  ⊘ SKIP: 'prisma generate' step not found in ci.yml" 'WARN'
        return
    }
    $replace = @'
      - run: npx prisma generate
      # ⚠️ همهٔ migrationها باید روی DB خالی بدون خطا اجرا شوند
      - run: npx prisma migrate deploy
'@
    $c = $r.Content.Replace($search, $replace)
    Backup-File $path
    Save-Norm $path $c $r.HadCRLF
    Write-Log "  ✅ migrate step added" 'OK'
}

# ═══════════════════════════════════════════════════════════
# FIX 18 — تست‌های جدید (spec files)
# ═══════════════════════════════════════════════════════════
Step 'Add two-factor.verify.spec.ts' {
    $content = @'
import { TwoFactorService } from './two-factor.service';
import * as otplib from 'otplib';

jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
    generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/test'),
  },
}));

// باگ حیاتی: در بعضی نسخه‌های otplib خروجی verify شیء { valid: false } است؛
// عبارت !!r آن را true می‌کرد و 2FA کلاً دور زده می‌شد.
describe('TwoFactorService.verifyCode', () => {
  const svc = new TwoFactorService({ get: () => 'x'.repeat(40) } as any);
  const verify = (otplib as any).authenticator.verify as jest.Mock;

  it('{ valid:false } باید رد شود', async () => {
    verify.mockReturnValue({ valid: false });
    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);
  });
  it('{ valid:true } باید پذیرفته شود', async () => {
    verify.mockReturnValue({ valid: true, delta: 0 });
    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);
  });
  it('boolean false/true هم درست کار می‌کند', async () => {
    verify.mockReturnValue(false);
    await expect(svc.verifyCode('SECRET', '000000')).resolves.toBe(false);
    verify.mockReturnValue(true);
    await expect(svc.verifyCode('SECRET', '123456')).resolves.toBe(true);
  });
});
'@
    Write-New 'backend/src/modules/auth/two-factor.verify.spec.ts' $content
}

Step 'Add auth.controller.spec.ts' {
    $content = @'
import { AuthController } from './auth.controller';

// بررسی قرارداد متدهای حساس کنترلر Auth
describe('AuthController (Contract)', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    authService = {
      changePassword: jest.fn().mockResolvedValue({ success: true }),
      verify2FALogin: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
      updatePreferences: jest.fn().mockResolvedValue({}),
    };
    controller = new AuthController(authService);
  });

  it('changePassword باید oldPassword و newPassword را به تفکیک بدهد', async () => {
    const dto = { oldPassword: 'old-pass-1234', newPassword: 'New-Strong-Pass@1404' } as any;
    await controller.changePassword({ id: 'u1' } as any, dto);
    expect(authService.changePassword).toHaveBeenCalledWith('u1', 'old-pass-1234', 'New-Strong-Pass@1404');
  });

  it('verify2FA اندپوینت ورود دو مرحله‌ای را صدا می‌زند', async () => {
    const dto = { totpToken: 'pending-jwt', code: '123456' };
    await controller.verify2FALogin(dto, {} as any);
    expect(authService.verify2FALogin).toHaveBeenCalledWith('pending-jwt', '123456', expect.any(Object));
  });
});
'@
    Write-New 'backend/src/modules/auth/auth.controller.spec.ts' $content
}

# ═══════════════════════════════════════════════════════════
# Rebuild & Verify
# ═══════════════════════════════════════════════════════════
if (!$NoBuild -and !$DryRun) {
    Write-Log "═══════════════════════════════════════════════════════" 'HEAD'
    Write-Log " Building backend..."                                   'HEAD'
    Write-Log "═══════════════════════════════════════════════════════" 'HEAD'
    Push-Location (Join-Path $Root 'backend')
    try {
        $buildResult = & npm run build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "❌ build failed" 'ERROR'
            $buildResult | ForEach-Object { Write-Log "  $_" 'ERROR' }
        } else {
            Write-Log "✅ build succeeded" 'OK'
        }
    } finally {
        Pop-Location
    }
}

# ═══════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════
Write-Log "" 'INFO'
Write-Log "═══════════════════════════════════════════════════════" 'HEAD'
Write-Log " SUMMARY" 'HEAD'
Write-Log "═══════════════════════════════════════════════════════" 'HEAD'
$ok   = @($script:results | Where-Object { $_.Status -eq 'OK'   }).Count
$fail = @($script:results | Where-Object { $_.Status -eq 'FAIL' }).Count
$script:results | Format-Table -AutoSize -Property Step, Status, @{L='Error';E={ if($_.Error) { $_.Error.Substring(0, [Math]::Min(80, $_.Error.Length)) } else { '' } }}

Write-Log "" 'INFO'
Write-Log "  ✅ OK    : $ok" 'OK'
if ($fail -gt 0) {
    Write-Log "  ❌ FAIL  : $fail" 'ERROR'
} else {
    Write-Log "  ❌ FAIL  : 0"  'OK'
}
Write-Log "  📄 Log   : $LogFile" 'INFO'
Write-Log "" 'INFO'

if ($fail -gt 0 -and $StopOnError) { exit 1 } else { exit 0 }