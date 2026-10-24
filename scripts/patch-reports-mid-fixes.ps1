# ============================================================
# Fix: analytics-summary.ts - Decimal type + export AgingDetail
# ============================================================
$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path
    $p    = Join-Path $base 'src\modules\accounting\reports\helpers\analytics-summary.ts'

    if (-not (Test-Path -LiteralPath $p)) { throw "Missing: $p" }
    $s = [System.IO.File]::ReadAllText($p, $utf8)

    if ($s.Contains('export interface AgingDetail') -and $s.Contains("import type { Prisma }")) {
        Write-Host "[SKIP] Already fixed." -ForegroundColor Yellow
        return
    }

    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    function RS { param($t,$f,$r,$l) if (-not $t.Contains($f)) { throw "FAIL: $l" }; return $t.Replace($f,$r) }

    # 1. import Prisma
    $s = RS $s `
        "import type { PrismaService } from '../../../../shared/prisma/prisma.service';" `
        "import type { PrismaService } from '../../../../shared/prisma/prisma.service';`nimport type { Prisma } from '@prisma/client';" `
        "import Prisma"

    # 2. LatestSnapshot.progressPct -> Prisma.Decimal | null
    $s = RS $s `
        'progressPct: number | null;' `
        'progressPct: Prisma.Decimal | null;' `
        "LatestSnapshot progressPct type"

    # 3. export AgingDetail
    $s = RS $s `
        'interface AgingDetail {' `
        'export interface AgingDetail {' `
        "export AgingDetail"

    # 4. export LatestSnapshot too (safety)
    if ($s.Contains('interface LatestSnapshot {')) {
        $s = $s.Replace('interface LatestSnapshot {', 'export interface LatestSnapshot {')
    }

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)

    Write-Host ""
    Write-Host "=== Fix applied ===" -ForegroundColor Green
    Write-Host "Backup: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
}
finally {
    Pop-Location
}