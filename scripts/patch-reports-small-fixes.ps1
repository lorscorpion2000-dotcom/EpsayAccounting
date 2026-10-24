# Fix TS4053: export ConsumptionItem so it can be named in inferred return types
$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path
    $p    = Join-Path $base 'src\modules\accounting\reports\helpers\ops-summary.ts'

    if (-not (Test-Path -LiteralPath $p)) { throw "Missing: $p" }
    $s = [System.IO.File]::ReadAllText($p, $utf8)

    if ($s.Contains('export interface ConsumptionItem')) {
        Write-Host "[SKIP] Already exported." -ForegroundColor Yellow
        return
    }

    $find = 'interface ConsumptionItem {'
    if (-not $s.Contains($find)) { throw "Pattern not found: '$find'" }

    $s = $s.Replace($find, 'export interface ConsumptionItem {')

    Copy-Item -LiteralPath $p "$p.bak-$ts" -Force
    [System.IO.File]::WriteAllText($p, $s, $utf8)

    Write-Host "=== Fix applied: ConsumptionItem exported ===" -ForegroundColor Green
    Write-Host "Backup: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
}
finally {
    Pop-Location
}