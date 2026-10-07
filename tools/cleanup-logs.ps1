# cleanup-logs.ps1
# پاک‌سازی لاگ‌های قدیمی
# — لاگ‌های rotated NSSM: 7 روز
# — لاگ‌های monitor/backup/alerts: 90 روز
# — لاگ‌های حال حاظر (بدون timestamp): نگه‌داری همیشه

$ErrorActionPreference = 'Continue'

$Root = 'E:\EpsayAccounting'
$LogRoot = Join-Path $Root 'logs'
$SelfLog = Join-Path $LogRoot 'cleanup.log'

function Write-Log {
    param([string]$Msg, [string]$Level = 'INFO')
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Msg"
    Add-Content -Path $SelfLog -Value $line -Encoding UTF8
    Write-Host $line
}

# ─── لاگ‌های rotated در logs/ (NSSM timestamp) ───
$cutoff7 = (Get-Date).AddDays(-7)
$patterns7 = @(
    'backend-out-*.log',
    'backend-err-*.log',
    'frontend-out-*.log',
    'frontend-err-*.log',
    'backend-out-*.log.corrupt*',
    'backend-err-*.log.corrupt*'
)

$removed7 = 0
$freed7 = 0

foreach ($pattern in $patterns7) {
    $files = Get-ChildItem $LogRoot -Filter $pattern -File -ErrorAction SilentlyContinue |
             Where-Object { $_.LastWriteTime -lt $cutoff7 }
    foreach ($f in $files) {
        $size = $f.Length
        try {
            Remove-Item $f.FullName -Force -ErrorAction Stop
            $removed7++
            $freed7 += $size
        } catch {
            # فایل ممکنه در حال استفاده باشه
        }
    }
}

if ($removed7 -gt 0) {
    $freedMB = [math]::Round($freed7 / 1MB, 2)
    Write-Log "Removed $removed7 rotated log(s) older than 7 days ($freedMB MB)"
} else {
    Write-Log "No rotated logs older than 7 days"
}

# ─── لاگ‌های monitor/backup/alerts (90 روز) ───
$cutoff90 = (Get-Date).AddDays(-90)
$subdirs = @('monitor', 'backup', 'alerts')

$removed90 = 0
$freed90 = 0

foreach ($sub in $subdirs) {
    $dir = Join-Path $LogRoot $sub
    if (-not (Test-Path $dir)) { continue }

    $files = Get-ChildItem $dir -File -ErrorAction SilentlyContinue |
             Where-Object { $_.LastWriteTime -lt $cutoff90 }
    foreach ($f in $files) {
        $size = $f.Length
        try {
            Remove-Item $f.FullName -Force -ErrorAction Stop
            $removed90++
            $freed90 += $size
        } catch { }
    }
}

if ($removed90 -gt 0) {
    $freedMB = [math]::Round($freed90 / 1MB, 2)
    Write-Log "Removed $removed90 monitoring log(s) older than 90 days ($freedMB MB)"
} else {
    Write-Log "No monitoring logs older than 90 days"
}

# ─── آمار نهایی ───
$remaining = Get-ChildItem $LogRoot -Recurse -File -ErrorAction SilentlyContinue
$totalMB = [math]::Round(($remaining | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Log "Logs dir now: $($remaining.Count) files, $totalMB MB"

# ─── محدود کردن اندازه cleanup.log ───
if (Test-Path $SelfLog) {
    $lines = (Get-Content $SelfLog -ErrorAction SilentlyContinue).Count
    if ($lines -gt 5000) {
        $content = Get-Content $SelfLog -ErrorAction SilentlyContinue
        $content | Select-Object -Last 1000 | Set-Content -Path $SelfLog -Encoding UTF8
        Write-Log "Trimmed cleanup.log to 1000 lines"
    }
}

exit 0
