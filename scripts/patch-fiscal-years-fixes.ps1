# ============================================================
# Fix build errors from patch-fiscal-years.ps1
# 1. controller: guard req.user + cast to AdminUser
# 2. service:    FiscalYear type is top-level, not under Prisma namespace
# Safe: nothing written if any pattern missing.
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false

    $base     = (Get-Location).Path
    $ctrlPath = Join-Path $base 'src\modules\accounting\fiscal-years.controller.ts'
    $svcPath  = Join-Path $base 'src\modules\accounting\fiscal-years.service.ts'

    foreach ($p in @($ctrlPath, $svcPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing file: $p" }
    }

    $controller = [System.IO.File]::ReadAllText($ctrlPath, $utf8)
    $service    = [System.IO.File]::ReadAllText($svcPath,  $utf8)

    if ($controller.Contains('as unknown as AdminUser') -and
        $service.Contains('import type { FiscalYear }')) {
        Write-Host "[SKIP] Fixes already applied." -ForegroundColor Yellow
        return
    }

    $ctrlCRLF = $controller.Contains("`r`n")
    $svcCRLF  = $service.Contains("`r`n")
    $controller = $controller.Replace("`r`n", "`n")
    $service    = $service.Replace("`r`n", "`n")

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
    # CONTROLLER
    # ============================================================

    # 1. add UnauthorizedException to @nestjs/common import
    $controller = Apply-Patch $controller `
        "import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';" `
        "import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';" `
        "controller: add UnauthorizedException import"

    # 2. add AdminUser type after AuthenticatedRequest
    $findAuthReq = 'type AuthenticatedRequest = Request & { user?: AuthUser };'
    $replAuthReq = @'
type AuthenticatedRequest = Request & { user?: AuthUser };

/**
 * AdminUser type is extracted from SoftDeleteService signature so we don't
 * duplicate the shape here. Routes are guarded by @RequirePermissions, so
 * req.user is present at runtime.
 */
type AdminUser = Parameters<SoftDeleteService['adminDelete']>[0]['user'];
'@
    $controller = Apply-Patch $controller $findAuthReq $replAuthReq "controller: add AdminUser type"

    # 3. adminDelete: guard + cast
    $findAdminDelete = @'
    const user = req.user || {};
    return this.softDelete.adminDelete({
'@
    $replAdminDelete = @'
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.adminDelete({
'@
    $controller = Apply-Patch $controller $findAdminDelete $replAdminDelete "controller: adminDelete guard"

    # 4. restore: guard + cast
    $findRestore = @'
    const user = req.user || {};
    return this.softDelete.restore({
'@
    $replRestore = @'
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const user = req.user as unknown as AdminUser;
    return this.softDelete.restore({
'@
    $controller = Apply-Patch $controller $findRestore $replRestore "controller: restore guard"

    # ============================================================
    # SERVICE
    # ============================================================

    # 1. import FiscalYear type (top-level, not Prisma.FiscalYear)
    $service = Apply-Patch $service `
        "import { Prisma } from '@prisma/client';" `
        "import { Prisma } from '@prisma/client';`nimport type { FiscalYear } from '@prisma/client';" `
        "service: import FiscalYear type"

    # 2. Prisma.FiscalYear -> FiscalYear
    $service = Apply-Patch $service `
        ') => Prisma.PrismaPromise<Prisma.FiscalYear | null>;' `
        ') => Prisma.PrismaPromise<FiscalYear | null>;' `
        "service: FiscalYear type reference"

    # ============================================================
    # WRITE
    # ============================================================
    if ($ctrlCRLF) { $controller = $controller.Replace("`n", "`r`n") }
    if ($svcCRLF)  { $service    = $service.Replace("`n", "`r`n") }

    Copy-Item -LiteralPath $ctrlPath "$ctrlPath.bak-$ts" -Force
    Copy-Item -LiteralPath $svcPath  "$svcPath.bak-$ts"  -Force

    [System.IO.File]::WriteAllText($ctrlPath, $controller, $utf8)
    [System.IO.File]::WriteAllText($svcPath,  $service,    $utf8)

    Write-Host ""
    Write-Host "=== Fixes applied ===" -ForegroundColor Green
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Now verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/fiscal-years.controller.ts src/modules/accounting/fiscal-years.service.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}