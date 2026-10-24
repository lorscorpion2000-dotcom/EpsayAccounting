# ============================================================
# Patch: detail-accounts.service - remove explicit any (20 -> 0)
# Pure ASCII (mojibake-safe). Persian text never touched.
# Safe: nothing written if any pattern missing.
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path
    $svcPath = Join-Path $base 'src\modules\accounting\detail-accounts.service.ts'

    if (-not (Test-Path -LiteralPath $svcPath)) { throw "Missing: $svcPath" }

    $service = [System.IO.File]::ReadAllText($svcPath, $utf8)

    if ($service.Contains('AccountLevel.DETAIL')) {
        Write-Host "[SKIP] Patch already applied." -ForegroundColor Yellow
        return
    }

    $crlf = $service.Contains("`r`n")
    $service = $service.Replace("`r`n", "`n")

    function Replace-Safe {
        param([string]$text, [string]$find, [string]$repl, [string]$label)
        $fn = $find.Replace("`r`n", "`n")
        $rn = $repl.Replace("`r`n", "`n")
        if (-not $text.Contains($fn)) {
            throw "PATCH FAILED: $label - pattern not found"
        }
        return $text.Replace($fn, $rn)
    }

    # 1. Import AccountLevel enum
    $service = Replace-Safe $service `
        "import { AccountDetailType, Prisma } from '@prisma/client';" `
        "import { AccountDetailType, AccountLevel, Prisma } from '@prisma/client';" `
        "import AccountLevel"

    # 2. create() block - build typed data then call create
    $findCreate = @'
const created = await tx.account.create({
      data: {
        code: nextCode,
        name: entityName,
        level: 'DETAIL' as any,
        nature: parent.nature,
        parentId: parent.id,
        isPostable: true,
        isActive: true,
        detailType: detailType as any,
        detailId: entityId,
      } as any,
    });
'@
    $replCreate = @'
const createData: Prisma.AccountUncheckedCreateInput = {
      code: nextCode,
      name: entityName,
      level: AccountLevel.DETAIL,
      nature: parent.nature,
      parentId: parent.id,
      isPostable: true,
      isActive: true,
      detailType: detailType,
      detailId: entityId,
    };
    const created = await tx.account.create({ data: createData });
'@
    $service = Replace-Safe $service $findCreate $replCreate "create block"

    # 3. where { detailType, detailId: entityId } as any (both places)
    $service = Replace-Safe $service `
        'where: { detailType, detailId: entityId } as any,' `
        'where: { detailType, detailId: entityId },' `
        "where detailType+detailId"

    # 4. mapPartnerTypeToDetail - use enum values
    $findMap = @'
const mapPartnerTypeToDetail: Partial<Record<string, AccountDetailType>> = {
      CLIENT: 'CUSTOMER' as any,
      SUPPLIER: 'SUPPLIER' as any,
      CONTRACTOR: 'CONTRACTOR' as any,
    };
'@
    $replMap = @'
const mapPartnerTypeToDetail: Partial<Record<string, AccountDetailType>> = {
      CLIENT: AccountDetailType.CUSTOMER,
      SUPPLIER: AccountDetailType.SUPPLIER,
      CONTRACTOR: AccountDetailType.CONTRACTOR,
    };
'@
    $service = Replace-Safe $service $findMap $replMap "mapPartnerTypeToDetail"

    # 5. partners findFirst where
    $service = Replace-Safe $service `
        'where: { detailType: dt as any, detailId: p.id } as any,' `
        'where: { detailType: dt, detailId: p.id },' `
        "partners findFirst where"

    # 6. partners ensure call
    $service = Replace-Safe $service `
        'detailType: dt as any,' `
        'detailType: dt,' `
        "partners ensure detailType"

    # 7. isActive where - BOTH employee + pettyCash instances
    $service = Replace-Safe $service `
        'where: { isActive: true } as any,' `
        'where: { isActive: true },' `
        "isActive where (all)"

    # 8. employees findFirst where - 2 casts
    $service = Replace-Safe $service `
        "where: { detailType: 'EMPLOYEE' as any, detailId: e.id } as any," `
        "where: { detailType: AccountDetailType.EMPLOYEE, detailId: e.id }," `
        "employees findFirst"

    # 9. employees ensure call
    $service = Replace-Safe $service `
        "detailType: 'EMPLOYEE' as any," `
        "detailType: AccountDetailType.EMPLOYEE," `
        "employees ensure detailType"

    # 10. pettyCash findFirst where - 2 casts
    $service = Replace-Safe $service `
        "where: { detailType: 'PETTY_CASH' as any, detailId: pc.id } as any," `
        "where: { detailType: AccountDetailType.PETTY_CASH, detailId: pc.id }," `
        "pettyCash findFirst"

    # 11. pettyCash ensure call
    $service = Replace-Safe $service `
        "detailType: 'PETTY_CASH' as any," `
        "detailType: AccountDetailType.PETTY_CASH," `
        "pettyCash ensure detailType"

    # 12. (pc as any).name cast
    $service = Replace-Safe $service `
        '(pc as any).name' `
        '(pc as unknown as { name?: string }).name' `
        "pc.name cast"

    # ============================================================
    # VERIFY
    # ============================================================
    $remaining = ([regex]::Matches($service, ':\s*any\b|<any>|as any|any\[\]')).Count

    # ============================================================
    # WRITE
    # ============================================================
    if ($crlf) { $service = $service.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $svcPath "$svcPath.bak-$ts" -Force
    [System.IO.File]::WriteAllText($svcPath, $service, $utf8)

    Write-Host ""
    Write-Host "=== Patch applied ===" -ForegroundColor Green
    Write-Host "Service 'any' remaining: $remaining"
    Write-Host "Backup: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/detail-accounts.service.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}