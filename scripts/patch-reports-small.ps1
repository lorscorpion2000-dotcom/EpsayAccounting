# ============================================================
# Patch: 4 small report files - remove explicit any (8 -> 0)
# Files: ar-aging-detail, ap-aging-detail, vat, ops-summary
# Pure ASCII (mojibake-safe). Safe: atomic, no partial writes.
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path

    $files = @{
        'ar'  = Join-Path $base 'src\modules\accounting\reports\ar-aging-detail.service.ts'
        'ap'  = Join-Path $base 'src\modules\accounting\reports\ap-aging-detail.service.ts'
        'vat' = Join-Path $base 'src\modules\accounting\reports\vat.service.ts'
        'ops' = Join-Path $base 'src\modules\accounting\reports\helpers\ops-summary.ts'
    }
    foreach ($k in $files.Keys) {
        if (-not (Test-Path -LiteralPath $files[$k])) { throw "Missing: $($files[$k])" }
    }

    function Replace-Safe {
        param([string]$text, [string]$find, [string]$repl, [string]$label)
        $fn = $find.Replace("`r`n", "`n")
        $rn = $repl.Replace("`r`n", "`n")
        if (-not $text.Contains($fn)) { throw "PATCH FAILED [$label]: pattern not found" }
        return $text.Replace($fn, $rn)
    }

    # ============================================================
    # 1. ar-aging-detail.service.ts
    # ============================================================
    $p = $files['ar']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $s = Replace-Safe $s `
        "const key = bucket === 'CURRENT' ? 'current'" `
        "const key: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'over90' = bucket === 'CURRENT' ? 'current'" `
        "ar-aging key type"
    $s = Replace-Safe $s `
        '(totals as any)[key] += remaining;' `
        'totals[key] += remaining;' `
        "ar-aging totals"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] ar-aging-detail.service.ts" -ForegroundColor Green

    # ============================================================
    # 2. ap-aging-detail.service.ts
    # ============================================================
    $p = $files['ap']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $s = Replace-Safe $s `
        "const tKey = bucket === 'CURRENT' ? 'current'" `
        "const tKey: 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'over90' = bucket === 'CURRENT' ? 'current'" `
        "ap-aging tKey type"
    $s = Replace-Safe $s `
        '(totals as any)[tKey] += remaining;' `
        'totals[tKey] += remaining;' `
        "ap-aging totals"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] ap-aging-detail.service.ts" -ForegroundColor Green

    # ============================================================
    # 3. vat.service.ts
    # ============================================================
    $p = $files['vat']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $s = Replace-Safe $s `
        "import { PrismaService } from '../../../shared/prisma/prisma.service';" `
        "import { Prisma } from '@prisma/client';`nimport { PrismaService } from '../../../shared/prisma/prisma.service';" `
        "vat import Prisma"
    $s = Replace-Safe $s `
        'const where: any = {' `
        'const where: Prisma.JournalEntryWhereInput = {' `
        "vat where type"
    $s = Replace-Safe $s `
        'line.projectId = (e as any).lines.find((l: any) => l.projectId)?.projectId || null;' `
        'line.projectId = e.lines.find((l) => l.projectId)?.projectId || null;' `
        "vat projectId access"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] vat.service.ts" -ForegroundColor Green

    # ============================================================
    # 4. ops-summary.ts
    # ============================================================
    $p = $files['ops']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $s = Replace-Safe $s `
        "import type { PrismaService } from '../../../../shared/prisma/prisma.service';" `
        "import type { PrismaService } from '../../../../shared/prisma/prisma.service';`n`ninterface ConsumptionItem {`n  itemCode: string;`n  itemName: string;`n  unit: string;`n  quantity: number;`n  value: number;`n}" `
        "ops ConsumptionItem interface"
    $s = Replace-Safe $s `
        'const consumption: Record<string, any> = {};' `
        'const consumption: Record<string, ConsumptionItem> = {};' `
        "ops consumption type"
    $s = Replace-Safe $s `
        '.sort((a: any, b: any) => b.value - a.value)' `
        '.sort((a, b) => b.value - a.value)' `
        "ops sort params"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] ops-summary.ts" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== All patches applied (4 files) ===" -ForegroundColor Green
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host "  npx eslint src/modules/accounting/reports/ar-aging-detail.service.ts src/modules/accounting/reports/ap-aging-detail.service.ts src/modules/accounting/reports/vat.service.ts src/modules/accounting/reports/helpers/ops-summary.ts --ext .ts"
    Write-Host ""
}
finally {
    Pop-Location
}