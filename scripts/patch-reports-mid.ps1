# ============================================================
# Patch: 3 report files - remove explicit any (13 -> 0)
# budget-vs-actual.service.ts (1)
# accounting-summary.ts (6)
# analytics-summary.ts (6)
# Pure ASCII. Safe: atomic. Nothing written if any pattern missing.
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path

    $files = @{
        'bva'  = Join-Path $base 'src\modules\accounting\reports\budget-vs-actual.service.ts'
        'accs' = Join-Path $base 'src\modules\accounting\reports\helpers\accounting-summary.ts'
        'ans'  = Join-Path $base 'src\modules\accounting\reports\helpers\analytics-summary.ts'
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
    # 1. budget-vs-actual.service.ts
    # ============================================================
    $p = $files['bva']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $s = Replace-Safe $s `
        'wbsLevel: (b.wbsItem as any)?.level ?? null,' `
        'wbsLevel: b.wbsItem?.level ?? null,' `
        'bva: wbsLevel'

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] budget-vs-actual.service.ts" -ForegroundColor Green

    # ============================================================
    # 2. accounting-summary.ts
    # ============================================================
    $p = $files['accs']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $importLine = "import type { PrismaService } from '../../../../shared/prisma/prisma.service';"
    $importRepl = $importLine + @'


interface AccountSummaryAccumulator {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
}
'@
    $s = Replace-Safe $s $importLine $importRepl "accs: interface"

    $s = Replace-Safe $s `
        'const byAccount: Record<string, any> = {};' `
        'const byAccount: Record<string, AccountSummaryAccumulator> = {};' `
        "accs: byAccount type"

    $s = Replace-Safe $s `
        "const revenues = Object.values(byAccount).filter((a: any) => a.code.startsWith('4'));" `
        "const revenues = Object.values(byAccount).filter((a) => a.code.startsWith('4'));" `
        "accs: revenues filter"

    $s = Replace-Safe $s `
        "const expenses = Object.values(byAccount).filter((a: any) => a.code.startsWith('6') || a.code.startsWith('7'));" `
        "const expenses = Object.values(byAccount).filter((a) => a.code.startsWith('6') || a.code.startsWith('7'));" `
        "accs: expenses filter"

    $s = Replace-Safe $s `
        'const totalRevenue = revenues.reduce((s: number, a: any) => s + (a.credit - a.debit), 0);' `
        'const totalRevenue = revenues.reduce((s, a) => s + (a.credit - a.debit), 0);' `
        "accs: totalRevenue reduce"

    $s = Replace-Safe $s `
        'const totalExpense = expenses.reduce((s: number, a: any) => s + (a.debit - a.credit), 0);' `
        'const totalExpense = expenses.reduce((s, a) => s + (a.debit - a.credit), 0);' `
        "accs: totalExpense reduce"

    $findAcc = @'
    accounts: Object.values(byAccount)
      .map((a: any) => ({ ...a, balance: a.debit - a.credit }))
      .sort((a: any, b: any) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 50),
'@
    $replAcc = @'
    accounts: Object.values(byAccount)
      .map((a) => ({ ...a, balance: a.debit - a.credit }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 50),
'@
    $s = Replace-Safe $s $findAcc $replAcc "accs: accounts map/sort"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] accounting-summary.ts" -ForegroundColor Green

    # ============================================================
    # 3. analytics-summary.ts
    # ============================================================
    $p = $files['ans']
    $s = [System.IO.File]::ReadAllText($p, $utf8)
    $crlf = $s.Contains("`r`n")
    $s = $s.Replace("`r`n", "`n")

    $importRepl2 = $importLine + @'


interface AgingDetail {
  code: string;
  partner?: string;
  supplier?: string;
  date: Date;
  remaining: number;
  bucket: string;
}

interface LatestSnapshot {
  wbsItemId: string;
  progressPct: number | null;
  snapshotDate: Date;
}
'@
    $s = Replace-Safe $s $importLine $importRepl2 "ans: interfaces"

    $s = Replace-Safe $s `
        'const arDetails: any[] = [];' `
        'const arDetails: AgingDetail[] = [];' `
        "ans: arDetails type"

    $s = Replace-Safe $s `
        'const apDetails: any[] = [];' `
        'const apDetails: AgingDetail[] = [];' `
        "ans: apDetails type"

    $s = Replace-Safe $s `
        'const latest: Record<string, any> = {};' `
        'const latest: Record<string, LatestSnapshot> = {};' `
        "ans: latest type"

    $s = Replace-Safe $s `
        'for (const it of piItems as any[]) {' `
        'for (const it of piItems) {' `
        "ans: piItems loop"

    $s = Replace-Safe $s `
        'for (const it of giItems as any[]) {' `
        'for (const it of giItems) {' `
        "ans: giItems loop"

    $s = Replace-Safe $s `
        'const rows = wbsItems.map((w: any) => {' `
        'const rows = wbsItems.map((w) => {' `
        "ans: rows map"

    if ($crlf) { $s = $s.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)
    Write-Host "[OK] analytics-summary.ts" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== All patches applied (3 files) ===" -ForegroundColor Green
    Write-Host "Backups: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host ""
}
finally {
    Pop-Location
}