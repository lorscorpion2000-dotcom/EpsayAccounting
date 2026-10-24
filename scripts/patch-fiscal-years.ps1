# ============================================================
# Patch: fiscal-years — remove all explicit any (8 -> 0)
# Safe:    if any pattern missing, nothing is written.
# Idempotent: if already applied, exits early.
# Backups: *.bak-<timestamp>
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts        = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8      = New-Object System.Text.UTF8Encoding $false

    # --- resolve absolute paths (System.IO.File ignores PowerShell's CWD) ---
    $base      = (Get-Location).Path
    $ctrlPath  = Join-Path $base 'src\modules\accounting\fiscal-years.controller.ts'
    $svcPath   = Join-Path $base 'src\modules\accounting\fiscal-years.service.ts'

    foreach ($p in @($ctrlPath, $svcPath)) {
        if (-not (Test-Path -LiteralPath $p)) { throw "Missing file: $p" }
    }

    $controller = [System.IO.File]::ReadAllText($ctrlPath, $utf8)
    $service    = [System.IO.File]::ReadAllText($svcPath,  $utf8)

    # Idempotency check
    if ($controller.Contains('type AuthenticatedRequest') -and
        $service.Contains('FiscalYearFindFirstWithDeleted')) {
        Write-Host "[SKIP] Patches already applied. Nothing to do." -ForegroundColor Yellow
        return
    }

    $controllerHadCRLF = $controller.Contains("`r`n")
    $serviceHadCRLF    = $service.Contains("`r`n")

    # Normalize line endings to LF for reliable pattern matching
    $controller = $controller.Replace("`r`n", "`n")
    $service    = $service.Replace("`r`n", "`n")

    function Apply-Patch {
        param([string]$text, [string]$find, [string]$repl, [string]$label)
        $findN = $find.Replace("`r`n", "`n")
        $replN = $repl.Replace("`r`n", "`n")
        if (-not $text.Contains($findN)) {
            Write-Host ""
            Write-Host "[FAIL] $label" -ForegroundColor Red
            Write-Host "Pattern not found. Expected text:" -ForegroundColor Red
            Write-Host "---" -ForegroundColor DarkGray
            Write-Host $findN -ForegroundColor DarkGray
            Write-Host "---" -ForegroundColor DarkGray
            throw "Patch failed: $label (file not modified)"
        }
        return $text.Replace($findN, $replN)
    }

    # ============================================================
    # CONTROLLER
    # ============================================================

    # 1. Cleanup trailing semicolons on @nestjs/common import
    if ($controller -notmatch "from '@nestjs/common';{2,}") {
        throw "Patch failed: controller cleanup (no duplicate semicolons)"
    }
    $controller = $controller -replace "from '@nestjs/common';{2,}", "from '@nestjs/common';"

    # 2. Insert Request/AuthUser types after last import
    $ctrlImportEnd = "import { OptionalIntPipe } from '../../common/pipes/optional-int.pipe';"
    $ctrlNewImports = $ctrlImportEnd + @'


import type { Request } from 'express';

interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
}

type AuthenticatedRequest = Request & { user?: AuthUser };
'@
    $controller = Apply-Patch $controller $ctrlImportEnd $ctrlNewImports "controller: add Request types"

    # 3. adminDelete: req: any -> AuthenticatedRequest
    $oldAdmin = @'
  @Delete(':id/admin')
  @RequirePermissions('accounting.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: any,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'fiscalYear',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $newAdmin = @'
  @Delete(':id/admin')
  @RequirePermissions('accounting.update')
  async adminDelete(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user || {};
    return this.softDelete.adminDelete({
      model: 'fiscalYear',
      id,
      user,
      reason: body?.reason || '',
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $oldAdmin $newAdmin "controller: adminDelete"

    # 4. restore: req: any -> AuthenticatedRequest
    $oldRestore = @'
  @Patch(':id/restore')
  @RequirePermissions('accounting.update')
  async restore(@Param('id') id: string, @Req() req: any) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'fiscalYear',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers?.['user-agent'] },
    });
  }
'@
    $newRestore = @'
  @Patch(':id/restore')
  @RequirePermissions('accounting.update')
  async restore(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user || {};
    return this.softDelete.restore({
      model: 'fiscalYear',
      id,
      user,
      meta: { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    });
  }
'@
    $controller = Apply-Patch $controller $oldRestore $newRestore "controller: restore"

    # ============================================================
    # SERVICE
    # ============================================================

    # 1. Helper type for soft-delete escape hatch
    $svcImportEnd = "import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';"
    $svcNewImports = $svcImportEnd + @'


/**
 * Prisma soft-delete extension supports a `__withDeleted` flag that is not
 * part of the generated Prisma types. Narrow the call site explicitly.
 */
type FiscalYearFindFirstWithDeleted = (
  args: Prisma.FiscalYearFindFirstArgs & { __withDeleted?: boolean },
) => Prisma.PrismaPromise<Prisma.FiscalYear | null>;
'@
    $service = Apply-Patch $service $svcImportEnd $svcNewImports "service: helper type"

    # 2. (this.prisma.fiscalYear as any).findFirst
    $oldSoft = @'
    const softDeleted = await (this.prisma.fiscalYear as any).findFirst({
      __withDeleted: true,
      where: { code: dto.code, deletedAt: { not: null } },
    });
'@
    $newSoft = @'
    const softDeleted = await (
      this.prisma.fiscalYear.findFirst as unknown as FiscalYearFindFirstWithDeleted
    )({
      where: { code: dto.code, deletedAt: { not: null } },
      __withDeleted: true,
    });
'@
    $service = Apply-Patch $service $oldSoft $newSoft "service: soft-delete findFirst"

    # 3. data: any
    $service = Apply-Patch $service `
        '    const data: any = {};' `
        '    const data: Prisma.FiscalYearUpdateInput = {};' `
        "service: update data type"

    # 4. closingLines: any[]
    $service = Apply-Patch $service `
        '    const closingLines: any[] = [];' `
        '    const closingLines: Prisma.JournalLineUncheckedCreateWithoutJournalEntryInput[] = [];' `
        "service: closingLines type"

    # 5. openingLines: any[]
    $service = Apply-Patch $service `
        '    const openingLines: any[] = [];' `
        '    const openingLines: Prisma.JournalLineUncheckedCreateWithoutJournalEntryInput[] = [];' `
        "service: openingLines type"

    # 6. client: any
    $service = Apply-Patch $service `
        '    const client: any = (tx as any) ?? this.prisma;' `
        '    const client: Prisma.TransactionClient = tx ?? (this.prisma as Prisma.TransactionClient);' `
        "service: client type"

    # ============================================================
    # WRITE (restore original EOL)
    # ============================================================
    if ($controllerHadCRLF) { $controller = $controller.Replace("`n", "`r`n") }
    if ($serviceHadCRLF)    { $service    = $service.Replace("`n", "`r`n") }

    Copy-Item -LiteralPath $ctrlPath "$ctrlPath.bak-$ts" -Force
    Copy-Item -LiteralPath $svcPath  "$svcPath.bak-$ts"  -Force

    [System.IO.File]::WriteAllText($ctrlPath, $controller, $utf8)
    [System.IO.File]::WriteAllText($svcPath,  $service,    $utf8)

    Write-Host ""
    Write-Host "=== All patches applied ===" -ForegroundColor Green
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