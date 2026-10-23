[CmdletBinding()]
param(
    [string]$Module = "",
    [string]$Path   = "",
    [switch]$Report,
    [switch]$Backup,
    [switch]$Verify,
    [switch]$Rollback,
    [switch]$ListBackups,
    [switch]$Open,
    [string]$Root = "E:\EpsayAccounting"
)

$ErrorActionPreference = 'Stop'

$backendDir = Join-Path $Root "backend"
if (-not (Test-Path $backendDir)) {
    Write-Host "[FAIL] backend not found: $backendDir" -ForegroundColor Red
    exit 1
}

if ($Path) {
    $targetDir = $Path
    $moduleName = Split-Path $Path -Leaf
} elseif ($Module) {
    $targetDir = Join-Path $backendDir "src\modules\$Module"
    $moduleName = $Module
} else {
    Write-Host "[FAIL] specify -Module <name> or -Path <dir>" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $targetDir)) {
    Write-Host "[FAIL] module not found: $targetDir" -ForegroundColor Red
    exit 1
}

$backupRoot = Join-Path $backendDir ".cleanup-backup"
if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$header = "==========================================================="

if ($Report) {
    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  REPORT - module: $moduleName" -ForegroundColor Cyan
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  dir: $targetDir" -ForegroundColor Gray
    Write-Host ""

    $files = Get-ChildItem -Path $targetDir -Recurse -Filter "*.ts" -File | Sort-Object FullName

    $total = 0
    $rptLines = New-Object System.Collections.Generic.List[string]
    $rptLines.Add("# Any-report - $moduleName ($timestamp)")
    $rptLines.Add("")

    foreach ($f in $files) {
        $lines = [System.IO.File]::ReadAllLines($f.FullName)
        $fileHits = @()

        for ($i = 0; $i -lt $lines.Length; $i++) {
            $line = $lines[$i]
            $lineNum = $i + 1
            if ($line.TrimStart().StartsWith('//')) { continue }

            $found = [regex]::Matches($line, '\bany\b')
            foreach ($m in $found) {
                $col = $m.Index + 1
                $start = [Math]::Max(0, $m.Index - 8)
                $len = [Math]::Min(16, $line.Length - $start)
                $snip = $line.Substring($start, $len).Trim()

                $kind = 'unknown'
                $before = ''
                if ($m.Index -ge 5) { $before = $line.Substring($m.Index - 5, 5) }
                if ($before -match ':\s*$')   { $kind = 'type-annotation' }
                elseif ($before -match 'as\s') { $kind = 'as-cast' }

                $fileHits += [PSCustomObject]@{
                    Line = $lineNum
                    Col = $col
                    Kind = $kind
                    Snippet = $snip
                }
            }
        }

        if ($fileHits.Count -gt 0) {
            $rel = $f.FullName.Substring($targetDir.Length).TrimStart([char[]]@('\', '/'))
            Write-Host ("  [FILE] {0}  ({1} hits)" -f $rel, $fileHits.Count) -ForegroundColor Yellow
            $rptLines.Add("## $rel")
            $rptLines.Add("")
            foreach ($h in $fileHits) {
                $text = "  {0,4}:{1,-4}  [{2,-16}]  {3}" -f $h.Line, $h.Col, $h.Kind, $h.Snippet
                Write-Host $text -ForegroundColor DarkGray
                $rptLines.Add($text.TrimStart())
            }
            $rptLines.Add("")
            $total += $fileHits.Count
        }
    }

    $rptLines.Add("")
    $rptLines.Add("**Total**: $total")
    $reportFile = Join-Path $backupRoot "$moduleName-any-report-$timestamp.md"
    [System.IO.File]::WriteAllText($reportFile, ($rptLines -join "`n"), (New-Object System.Text.UTF8Encoding $false))

    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host ("  [OK] Total: {0} 'any' occurrences" -f $total) -ForegroundColor Green
    Write-Host "  Report: $reportFile" -ForegroundColor Green
    Write-Host $header -ForegroundColor Cyan
    Write-Host ""
}

if ($Backup) {
    $snapshotDir = Join-Path $backupRoot "$moduleName-$timestamp"
    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  BACKUP - $moduleName -> $snapshotDir" -ForegroundColor Cyan
    Write-Host $header -ForegroundColor Cyan

    Copy-Item -Path $targetDir -Destination $snapshotDir -Recurse -Force
    Write-Host "  [OK] snapshot created" -ForegroundColor Green
    Write-Host ""
}

if ($Verify) {
    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  VERIFY - build + lint for module: $moduleName" -ForegroundColor Cyan
    Write-Host $header -ForegroundColor Cyan

    Push-Location $backendDir
    try {
        Write-Host ""
        Write-Host "  > npm run build..." -ForegroundColor Yellow
        $buildOutput = & npm run build 2>&1
        $buildExit = $LASTEXITCODE

        if ($buildExit -ne 0) {
            Write-Host ""
            Write-Host "  [FAIL] BUILD FAILED - rolling back $moduleName" -ForegroundColor Red
            Write-Host ""

            $latest = Get-ChildItem $backupRoot -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -like "$moduleName-*" } |
                Sort-Object Name -Descending |
                Select-Object -First 1

            if ($latest) {
                Remove-Item -Path $targetDir -Recurse -Force
                Copy-Item -Path $latest.FullName -Destination $targetDir -Recurse -Force
                Write-Host "  [ROLLBACK] from: $($latest.Name)" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] no backup found - you must restore manually" -ForegroundColor Yellow
            }
            $buildOutput | Select-Object -Last 40 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
            exit 1
        }

        Write-Host "  [OK] build passed" -ForegroundColor Green
        Write-Host ""
        Write-Host "  > npx eslint on module..." -ForegroundColor Yellow

        $relPath = "src/modules/$moduleName"
        if ($Path) {
            $relPath = $Path.Substring($backendDir.Length).TrimStart([char[]]@('\', '/'))
        }

        $lintOutput = & npx eslint $relPath 2>&1
        $lintExit = $LASTEXITCODE
        $lintOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

        Write-Host ""
        if ($lintExit -eq 0) {
            Write-Host "  [OK] lint passed" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] lint warnings/errors remain - see above" -ForegroundColor Yellow
        }
    } finally {
        Pop-Location
    }
    Write-Host $header -ForegroundColor Cyan
    Write-Host ""
}

if ($Rollback) {
    $latest = Get-ChildItem $backupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$moduleName-*" } |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if (-not $latest) {
        Write-Host "[FAIL] no backup for $moduleName" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  ROLLBACK - $moduleName <- $($latest.Name)" -ForegroundColor Cyan
    Write-Host $header -ForegroundColor Cyan

    Remove-Item -Path $targetDir -Recurse -Force
    Copy-Item -Path $latest.FullName -Destination $targetDir -Recurse -Force
    Write-Host "  [OK] restored" -ForegroundColor Green
    Write-Host ""
}

if ($ListBackups) {
    Write-Host ""
    Write-Host $header -ForegroundColor Cyan
    Write-Host "  BACKUPS - $moduleName" -ForegroundColor Cyan
    Write-Host $header -ForegroundColor Cyan
    $list = Get-ChildItem $backupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$moduleName-*" } |
        Sort-Object Name -Descending
    if (-not $list) {
        Write-Host "  (no backups)" -ForegroundColor DarkGray
    } else {
        $list | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
    }
    Write-Host ""
}

if ($Open) {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        & code $targetDir
        Write-Host "  [OK] opened in VSCode: $targetDir" -ForegroundColor Green
    } else {
        Start-Process explorer.exe $targetDir
        Write-Host "  [OK] opened in Explorer (VSCode CLI not found)" -ForegroundColor Yellow
    }
}