<#
.SYNOPSIS
  Reverses mojibake in Persian text (UTF-8 -> CP1252 -> UTF-8 -> CP1251 chain).
.PARAMETER Path
  Folder to scan (default: backend\src\modules\payroll).
.PARAMETER DryRun
  If set, only report - do not modify files.
#>
param(
    [string]$Path = "backend\src\modules\payroll",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$ts        = Get-Date -Format "yyyyMMdd-HHmmss"
$cp1251    = [System.Text.Encoding]::GetEncoding(1251)
$cp1252    = [System.Text.Encoding]::GetEncoding(1252)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Reverse-Segment([string]$seg) {
    try {
        $b1 = $cp1251.GetBytes($seg)
        for ($i = 0; $i -lt $b1.Length; $i++) {
            if ($b1[$i] -eq 0x3F -and $seg[$i] -ne '?') { return $null }
        }
        $s1 = $utf8NoBom.GetString($b1)
        $b2 = $cp1252.GetBytes($s1)
        for ($i = 0; $i -lt $b2.Length; $i++) {
            if ($b2[$i] -eq 0x3F -and $s1[$i] -ne '?') { return $null }
        }
        return $utf8NoBom.GetString($b2)
    } catch { return $null }
}

# Mojibake fingerprint: 4+ consecutive chars from Cyrillic / Latin-1 / punctuation blocks
$candidatePattern = '[\u0400-\u04FF\u00A0-\u00FF\u2010-\u201F\u2000-\u206F]{4,}'
# Persian range check (Arabic block)
$persianPattern   = '[\u0600-\u06FF]'

if (-not (Test-Path $Path)) {
    Write-Host "Path not found: $Path" -ForegroundColor Red
    exit 1
}

$files = Get-ChildItem -Path $Path -Recurse -File -Include *.ts,*.tsx,*.js |
         Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\dist\\' }

Write-Host ""
Write-Host "=== Mojibake Scanner ===" -ForegroundColor Cyan
Write-Host "Path   : $Path"
Write-Host "Files  : $($files.Count)"
Write-Host "DryRun : $DryRun"
Write-Host ""

$summary    = @()
$grandFixes = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, $utf8NoBom)
    $raw     = [regex]::Matches($content, $candidatePattern)
    $segMatches = @($raw | Where-Object { $_.Value -match '[\u0400-\u04FF]' })
    if ($segMatches.Count -eq 0) { continue }

    $sb        = New-Object System.Text.StringBuilder
    $lastIdx   = 0
    $fixes     = 0
    $samples   = @()

    foreach ($m in $segMatches) {
        $rev = Reverse-Segment $m.Value
        if ($null -eq $rev) { continue }
        if ($rev -notmatch $persianPattern) { continue }

        $sb.Append($content.Substring($lastIdx, $m.Index - $lastIdx)) | Out-Null
        $sb.Append($rev) | Out-Null
        $lastIdx = $m.Index + $m.Length
        $fixes++
        if ($samples.Count -lt 2) {
            $beforeHex = ($m.Value.ToCharArray() | ForEach-Object { '{0:X4}' -f [int]$_ }) -join ' '
            $afterHex  = ($rev.ToCharArray()     | ForEach-Object { '{0:X4}' -f [int]$_ }) -join ' '
            $samples += "      before: $beforeHex"
            $samples += "      after : $afterHex"
        }
    }
    if ($lastIdx -lt $content.Length) {
        $sb.Append($content.Substring($lastIdx)) | Out-Null
    }

    if ($fixes -eq 0) { continue }

    Write-Host "[$fixes/$($segMatches.Count)] $($f.Name)" -ForegroundColor Yellow
    $samples | ForEach-Object { Write-Host $_ -ForegroundColor Gray }

    if (-not $DryRun) {
        $bak = "$($f.FullName).bak-fix-$ts"
        Copy-Item $f.FullName $bak -Force
        [System.IO.File]::WriteAllText($f.FullName, $sb.ToString(), $utf8NoBom)
    }

    $grandFixes += $fixes
    $summary += [PSCustomObject]@{ File = $f.Name; Fixed = $fixes; Total = $segMatches.Count }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($summary.Count -eq 0) {
    Write-Host "No fixable mojibake found." -ForegroundColor Green
} else {
    $summary | Format-Table -AutoSize | Out-String | Write-Host
    Write-Host ("Files fixed: {0}   Segments: {1}" -f $summary.Count, $grandFixes) -ForegroundColor Cyan
}
if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN -- no files were modified." -ForegroundColor Yellow
    Write-Host ""
}