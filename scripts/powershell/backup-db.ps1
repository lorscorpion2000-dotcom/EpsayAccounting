# scripts/powershell/backup-db.ps1
# PostgreSQL database backup with auto-detection + Telegram alerts + logging.

param(
    [string]$Root = "E:\EpsayAccounting",
    [int]$KeepDays = 30
)

$ErrorActionPreference = 'Continue'

# -- Logging setup -------------------------------------------
$LogDir = Join-Path $Root "logs\backup"
$LogFile = Join-Path $LogDir ("backup-" + (Get-Date -Format "yyyy-MM") + ".log")
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
    param([string]$Msg, [string]$Level = 'INFO')
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Msg"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    $color = switch ($Level) {
        'ERROR' { 'Red' }
        'WARN'  { 'Yellow' }
        'OK'    { 'Green' }
        default { 'Gray' }
    }
    Write-Host $line -ForegroundColor $color
}

# -- Telegram ------------------------------------------------
$TelegramConfigPath = Join-Path $Root "tools\telegram.config.json"
$TelegramConfig = $null
if (Test-Path $TelegramConfigPath) {
    try {
        $TelegramConfig = Get-Content $TelegramConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch { }
}
$script:TelegramLastSent = @{}

function Send-Telegram {
    param([string]$Msg, [string]$Level = 'ERROR')
    if (-not $TelegramConfig) { return }
    if (-not $TelegramConfig.enabled) { return }
    if ($TelegramConfig.levels -notcontains $Level) { return }
    $token = $TelegramConfig.botToken
    $chat  = $TelegramConfig.chatId
    if (-not $token -or $token -like "*PUT_YOUR*") { return }
    if (-not $chat  -or $chat  -like "*PUT_YOUR*") { return }

    $rl = [int]$TelegramConfig.rateLimitSeconds
    if ($rl -gt 0) {
        $last = $script:TelegramLastSent[$Level]
        if ($last) {
            $elapsed = ((Get-Date) - $last).TotalSeconds
            if ($elapsed -lt $rl) { return }
        }
        $script:TelegramLastSent[$Level] = Get-Date
    }

    $hostName = $env:COMPUTERNAME
    $prefix = [char]0x26A0
    $text = $prefix + " Epsay Backup [" + $Level + "]" + [Environment]::NewLine + $hostName + " - " + $Msg
    $body = @{ chat_id = $chat; text = $text } | ConvertTo-Json
    $uri = "https://api.telegram.org/bot" + $token + "/sendMessage"
    try {
        Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 10 -ErrorAction Stop | Out-Null
    } catch {
        Write-Log "Telegram send failed: $($_.Exception.Message)" 'WARN'
    }
}

# -- Resolve paths -------------------------------------------
if (-not (Test-Path $Root)) {
    Write-Log "Root not found: $Root" 'ERROR'
    Send-Telegram "Root not found: $Root" 'ERROR'
    exit 0
}
$Backend = Join-Path $Root "backend"
$BackupDir = Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# -- Find pg_dump --------------------------------------------
function Find-PgDump {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $paths = @(
        "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe",
        "$env:LOCALAPPDATA\Programs\PostgreSQL\*\bin\pg_dump.exe",
        "D:\PostgreSQL\*\bin\pg_dump.exe",
        "D:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        "E:\PostgreSQL\*\bin\pg_dump.exe",
        "F:\PostgreSQL\*\bin\pg_dump.exe"
    )
    foreach ($p in $paths) {
        $m = Get-ChildItem $p -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending |
             Select-Object -First 1
        if ($m) { return $m.FullName }
    }

    $svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($svc) {
        $svcInfo = Get-CimInstance Win32_Service -Filter "Name='$($svc.Name)'" -ErrorAction SilentlyContinue
        if ($svcInfo -and $svcInfo.PathName) {
            $mm = [regex]::Match($svcInfo.PathName, '"?([A-Za-z]:\\[^"]+?)\\bin\\')
            if ($mm.Success) {
                $exe = Join-Path $mm.Groups[1].Value "bin\pg_dump.exe"
                if (Test-Path $exe) { return $exe }
            }
        }
    }
    return $null
}

# -- Parse DATABASE_URL from .env ----------------------------
function Get-DbUrl {
    param([string]$BackendPath)
    $envFiles = @(".env", ".env.local", ".env.development")
    foreach ($f in $envFiles) {
        $full = Join-Path $BackendPath $f
        if (Test-Path $full) {
            $content = Get-Content $full -Raw -Encoding UTF8
            $m = [regex]::Match($content, 'DATABASE_URL\s*=\s*"?([^"\r\n]+)"?')
            if ($m.Success) { return $m.Groups[1].Value.Trim() }
        }
    }
    return $null
}

# -- Main ----------------------------------------------------
Write-Log "=== Backup started ==="

$pgDump = Find-PgDump
if (-not $pgDump) {
    Write-Log "pg_dump not found - skipping DB backup" 'ERROR'
    Send-Telegram "pg_dump یافت نشد - بکاپ انجام نشد" 'ERROR'
    exit 0
}
Write-Log "pg_dump: $pgDump"

$dbUrl = Get-DbUrl -BackendPath $Backend
if (-not $dbUrl) {
    Write-Log "DATABASE_URL not found in $Backend\.env" 'ERROR'
    Send-Telegram "DATABASE_URL در .env یافت نشد" 'ERROR'
    exit 0
}

$m = [regex]::Match($dbUrl, '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)')
if (-not $m.Success) {
    Write-Log "Could not parse DATABASE_URL" 'ERROR'
    Send-Telegram "خطا در پردازش DATABASE_URL" 'ERROR'
    exit 0
}

$DbUser = $m.Groups[1].Value
$DbPass = $m.Groups[2].Value
$DbHost = $m.Groups[3].Value
$DbPort = $m.Groups[4].Value
$DbName = $m.Groups[5].Value

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outFile = Join-Path $BackupDir "db-$stamp.sql"

Write-Log "Backing up $DbName@$DbHost`:$DbPort ..."

$env:PGPASSWORD = $DbPass
try {
    & $pgDump -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $outFile --no-owner --no-acl 2>&1 |
        ForEach-Object { Write-Log "  pg_dump: $_" }
    $code = $LASTEXITCODE
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if ($code -ne 0) {
    Write-Log "pg_dump exited with code $code" 'ERROR'
    if (Test-Path $outFile) { Remove-Item $outFile -Force -ErrorAction SilentlyContinue }
    Send-Telegram "بکاپ دیتابیس ناموفق بود (کد $code)" 'ERROR'
    exit 1
}

$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Log "Saved: db-$stamp.sql ($sizeMB MB)" 'OK'

# هشدار اگر حجم غیرعادی کم بود
if ((Get-Item $outFile).Length -lt 50KB) {
    Write-Log "WARN: backup file unusually small ($sizeMB MB)" 'WARN'
    Send-Telegram "حجم بکاپ غیرعادی کم است: $sizeMB MB" 'WARN'
}

# -- Cleanup old backups -------------------------------------
$cutoff = (Get-Date).AddDays(-$KeepDays)
$deleted = 0
Get-ChildItem $BackupDir -Filter "db-*.sql" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        $deleted++
    }
if ($deleted -gt 0) {
    Write-Log "Cleaned $deleted old backup(s) (older than $KeepDays days)"
}

# آمار
$all = Get-ChildItem $BackupDir -Filter "db-*.sql" -ErrorAction SilentlyContinue
$totalMB = [math]::Round(($all | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Log "Total backups: $($all.Count) files, $totalMB MB"
Write-Log "=== Backup finished ==="

exit 0
