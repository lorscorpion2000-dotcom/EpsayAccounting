# scripts/powershell/backup-db.ps1
# PostgreSQL database backup with auto-detection.

param(
    [string]$Root = "E:\EpsayAccounting",
    [int]$KeepDays = 7
)

$ErrorActionPreference = 'Continue'

# -- Resolve paths -------------------------------------------
if (-not (Test-Path $Root)) {
    Write-Host "  [!] Root not found: $Root" -ForegroundColor Yellow
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
$pgDump = Find-PgDump
if (-not $pgDump) {
    Write-Host "  [!] pg_dump not found - skipping DB backup" -ForegroundColor Yellow
    exit 0
}
Write-Host "  pg_dump: $pgDump" -ForegroundColor DarkGray

$dbUrl = Get-DbUrl -BackendPath $Backend
if (-not $dbUrl) {
    Write-Host "  [!] DATABASE_URL not found in $Backend\.env" -ForegroundColor Yellow
    exit 0
}

$m = [regex]::Match($dbUrl, '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)')
if (-not $m.Success) {
    Write-Host "  [!] Could not parse DATABASE_URL" -ForegroundColor Yellow
    exit 0
}

$DbUser = $m.Groups[1].Value
$DbPass = $m.Groups[2].Value
$DbHost = $m.Groups[3].Value
$DbPort = $m.Groups[4].Value
$DbName = $m.Groups[5].Value

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outFile = Join-Path $BackupDir "db-$stamp.sql"

Write-Host "  Backing up $DbName@$DbHost`:$DbPort ..." -ForegroundColor Cyan

$env:PGPASSWORD = $DbPass
try {
    & $pgDump -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $outFile --no-owner --no-acl 2>&1 |
        ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    $code = $LASTEXITCODE
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if ($code -ne 0) {
    Write-Host "  [X] pg_dump exited with code $code" -ForegroundColor Red
    if (Test-Path $outFile) { Remove-Item $outFile -Force -ErrorAction SilentlyContinue }
    exit 1
}

$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Host "  [OK] Saved: db-$stamp.sql ($sizeMB MB)" -ForegroundColor Green

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
    Write-Host "  Cleaned $deleted old backup(s)" -ForegroundColor DarkGray
}

exit 0