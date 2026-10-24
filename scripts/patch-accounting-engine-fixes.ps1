# ============================================================
# Fix build errors from patch-accounting-engine.ps1
# - interface: remove '| null' (CreateJournalDto uses string | undefined)
# - postEvent:  coerce payload.amount to Number() (string | number -> number)
# - postEvent:  null-safe optional fields with ?? undefined
# Safe: nothing written if any pattern missing
# ============================================================

$ErrorActionPreference = 'Stop'
Push-Location 'E:\EpsayAccounting\backend'
try {
    $ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $base = (Get-Location).Path
    $engPath = Join-Path $base 'src\modules\accounting\engine\accounting-engine.service.ts'

    if (-not (Test-Path -LiteralPath $engPath)) { throw "Missing: $engPath" }

    $engine = [System.IO.File]::ReadAllText($engPath, $utf8)

    if ($engine.Contains('debit: Number(payload.amount)')) {
        Write-Host "[SKIP] Fix already applied." -ForegroundColor Yellow
        return
    }

    $crlf = $engine.Contains("`r`n")
    $engine = $engine.Replace("`r`n", "`n")

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
    # 1. Interface: remove '| null'
    # ============================================================
    $engine = Apply-Patch $engine 'reference?: string | null;'   'reference?: string;'   "interface: reference"
    $engine = Apply-Patch $engine 'description?: string | null;' 'description?: string;' "interface: description"
    $engine = Apply-Patch $engine 'partnerId?: string | null;'   'partnerId?: string;'   "interface: partnerId"
    $engine = Apply-Patch $engine 'projectId?: string | null;'   'projectId?: string;'   "interface: projectId"
    $engine = Apply-Patch $engine 'costCenterId?: string | null;' 'costCenterId?: string;' "interface: costCenterId"

    # ============================================================
    # 2. postEvent: coerce payload.amount to Number (string|number -> number)
    # ============================================================
    $engine = Apply-Patch $engine 'debit: payload.amount,'  'debit: Number(payload.amount),'  "postEvent: debit"
    $engine = Apply-Patch $engine 'credit: payload.amount,' 'credit: Number(payload.amount),' "postEvent: credit"

    # ============================================================
    # 3. postEvent: null-safe optional fields
    # ============================================================
    $engine = Apply-Patch $engine 'reference: payload.reference,'   'reference: payload.reference ?? undefined,'   "reference null-safe"
    $engine = Apply-Patch $engine 'description: payload.description,' 'description: payload.description ?? undefined,' "description null-safe"
    $engine = Apply-Patch $engine 'partnerId: payload.partnerId,'   'partnerId: payload.partnerId ?? undefined,'   "partnerId null-safe"
    $engine = Apply-Patch $engine 'projectId: payload.projectId,'   'projectId: payload.projectId ?? undefined,'   "projectId null-safe"

    # ============================================================
    # WRITE
    # ============================================================
    if ($crlf) { $engine = $engine.Replace("`n", "`r`n") }
    Copy-Item -LiteralPath $engPath "$engPath.bak-$ts" -Force
    [System.IO.File]::WriteAllText($engPath, $engine, $utf8)

    Write-Host ""
    Write-Host "=== Fix applied ===" -ForegroundColor Green
    Write-Host "Backup: *.bak-$ts" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Verify:" -ForegroundColor Cyan
    Write-Host "  npm run build"
    Write-Host ""
}
finally {
    Pop-Location
}