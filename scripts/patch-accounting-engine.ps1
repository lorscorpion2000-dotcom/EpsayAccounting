# ============================================================
# Patch: accounting-engine + account-mapping.controller
# Removes all explicit any (7 -> 0)
# Safe: nothing written if any pattern missing
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false

    $base      = (Get-Location).Path
    $engPath   = Join-Path $base 'src\modules\accounting\engine\accounting-engine.service.ts'
    $ctrlPath  = Join-Path $base 'src\modules\accounting\engine\account-mapping.controller.ts'

    foreach ($p in @($engPath, $ctrlPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing file: $p" }
    }

    $engine     = [System.IO.File]::ReadAllText($engPath,  $utf8)
    $controller = [System.IO.File]::ReadAllText($ctrlPath, $utf8)

    if ($engine.Contains('interface JournalCreateInput') -and
        $controller.Contains('type AuthenticatedRequest')) {
        Write-Host "[SKIP] Patches already applied." -ForegroundColor Yellow
        return
    }

    $engCRLF  = $engine.Contains("`r`n")
    $ctrlCRLF = $controller.Contains("`r`n")
    $engine     = $engine.Replace("`r`n", "`n")
    $controller = $controller.Replace("`r`n", "`n")

    function Apply-Patch {
        param([string]$text, [string]$find, [string]$repl, [string]$label)
        $fn = $find.Replace("`r`n", "`n")
        $rn = $repl.Replace("`r`n", "`n")
        if (-not $text.Contains($fn)) {
            Write-Host "[FAIL] $label" -ForegroundColor Red
            Write-Host "Pattern not found:" -ForegroundColor Red
            Write-Host "---" -ForegroundColor DarkGray
            Write-Host $fn -ForegroundColor DarkGray
            Write-Host "---" -ForegroundColor DarkGray
            throw "Patch failed: $label (file not modified)"
        }
        return $text.Replace($fn, $rn)
    }

    # ============================================================
    # ENGINE
    # ============================================================

    # 1. Import Account type
    $engine = Apply-Patch $engine `
        "import { Prisma } from '@prisma/client';" `
        "import { Prisma } from '@prisma/client';`nimport type { Account } from '@prisma/client';" `
        "engine: import Account"

    # 2. Insert JournalCreateInput interface after PostEventPayload import
    $journalIface = @'


interface JournalCreateInput {
  fiscalYearId: string;
  entryDate: string;
  description: string;
  reference?: string | null;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
    partnerId?: string | null;
    projectId?: string | null;
    costCenterId?: string | null;
    sortOrder?: number;
  }>;
}
'@
    $findPostEvent = "import { PostEventPayload } from './dto/post-event.dto';"
    $engine = Apply-Patch $engine $findPostEvent ($findPostEvent + $journalIface) "engine: JournalCreateInput interface"

    # 3. const dto: any = {  (2 occurrences) — replace all
    if (([regex]::Matches($engine, 'const dto: any = \{')).Count -ne 2) {
        throw "engine: expected 2 occurrences of 'const dto: any = {'"
    }
    $engine = $engine -replace 'const dto: any = \{', 'const dto: JournalCreateInput = {'

    # 4. catch (e: any) -> catch (e) + safe message extraction
    $findCatch = @'
      } catch (e: any) {
        this.logger.warn('[' + sourceType + '] Auto-post failed for ' + entry.code + ': ' + e?.message);
        return entry;
      }
'@
    $replCatch = @'
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn('[' + sourceType + '] Auto-post failed for ' + entry.code + ': ' + msg);
        return entry;
      }
'@
    $engine = Apply-Patch $engine $findCatch $replCatch "engine: catch clause"

    # 5. base: any -> base: Account
    $findBase = @'
  private async resolveAccount(
    base: any,
    ctx: PostEventPayload,
    explicitDetailId?: string,
  ) {
'@
    $replBase = @'
  private async resolveAccount(
    base: Account,
    ctx: PostEventPayload,
    explicitDetailId?: string,
  ) {
'@
    $engine = Apply-Patch $engine $findBase $replBase "engine: resolveAccount base type"

    # ============================================================
    # CONTROLLER
    # ============================================================

    # 1. Add UnauthorizedException to @nestjs/common import
    $controller = Apply-Patch $controller `
        "import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';" `
        "import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';" `
        "controller: add UnauthorizedException"

    # 2. Insert Request/AuthUser/AdminUser types
    $ctrlTypes = @'


import type { Request } from 'express';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };

/**
 * AdminUser type comes from SoftDeleteService signature — avoids duplication.
 * Routes are guarded by @RequirePermissions, so req.user is present at runtime.
 */
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];
'@
    $findOptInt = "import { OptionalIntPipe } from '../../../common/pipes/optional-int.pipe';"
    $controller = Apply-Patch $controller $findOptInt ($findOptInt + $ctrlTypes) "controller: add types"

    # 3. remove method — req: any -> AuthenticatedRequest
    $controller = Apply-Patch $controller `
        'async remove(@Param(''id'') id: string, @Req() req: any) {' `
        'async remove(@Param(''id'') id: string, @Req() req: AuthenticatedRequest) {' `
        "controller: remove signature"

    # 4. adminDelete — req: any -> AuthenticatedRequest + guard + cast
    $findAdmin = @'
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'accountMapping',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $replAdmin = @'
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
      model: 'accountMapping',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $findAdmin $replAdmin "controller: adminDelete"

    # 5. restore — req: any -> AuthenticatedRequest + guard + cast
    $findRestore = @'
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'accountMapping',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $replRestore = @'
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
      model: 'accountMapping',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $findRestore $replRestore "controller: restore"

    # ============================================================
    # WRITE
    # ============================================================
    if ($engCRLF)  { $engine     = $engine.Replace("`n", "`r`n") }
    if ($ctrlCRLF) { $controller = $controller.Replace("`n", "`r`n") }

    Copy-Item -LiteralPath $engPath  "$engPath.bak-$ts"  -Force
    Copy-Item -LiteralPath $ctrlPath "$ctrlPath.bak-$ts" -Force

    [System.IO.File]::WriteAllText($engPath,  $engine,     $utf8)
    [System.IO.File]::WriteAllText($ctrlPath, $controller, $utf8)

    Write-Host ""
    Write-Host "=== All patches applied ===" -ForegroundColor Green
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/engine/accounting-engine.service.ts src/modules/accounting/engine/account-mapping.controller.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}