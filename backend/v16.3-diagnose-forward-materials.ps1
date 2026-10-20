param(
  [string]$BackendRoot = "E:\EpsayAccounting\backend"
)

$ErrorActionPreference = "Stop"
$file = Join-Path $BackendRoot "test\e2e\forward-materials.e2e.test.ts"
if (!(Test-Path $file)) { throw "File not found: $file" }

$content = Get-Content -LiteralPath $file -Raw -Encoding UTF8

Write-Host "FILE: $file"
Write-Host ("LEN : {0} chars" -f $content.Length)

# 1) Find prisma.item.create occurrences
$itemMatches = [regex]::Matches($content, "prisma\.item\.create\s*\(", "IgnoreCase")
Write-Host ("item.create occurrences: {0}" -f $itemMatches.Count)
if ($itemMatches.Count -gt 0) {
  $m = $itemMatches[0]
  Write-Host ("first item.create at index: {0}" -f $m.Index)
  $start = [Math]::Max(0, $m.Index - 400)
  $len   = [Math]::Min($content.Length - $start, 1200)
  Write-Host "---- context around first prisma.item.create ----"
  Write-Host ($content.Substring($start, $len))
  Write-Host "---- end context ----"
}

# 2) Find unquoted secret-xxxxxxxx tokens (very likely syntax breakers)
$secretMatches = [regex]::Matches($content, "(?<!['""])\bsecret-[0-9a-fA-F]{8}\b(?!['""])", "Multiline")
Write-Host ("unquoted secret-xxxxxxxx tokens: {0}" -f $secretMatches.Count)
if ($secretMatches.Count -gt 0) {
  $secretMatches | Select-Object -First 20 | ForEach-Object {
    Write-Host (" - index {0}: {1}" -f $_.Index, $_.Value)
  }
  if ($secretMatches.Count -gt 20) {
    Write-Host ("(showing first 20 of {0})" -f $secretMatches.Count)
  }
}

# 3) Quick sanity: does file contain "Unexpected const" risk patterns
$hasWeird = $content -match "unit\s*:\s*'NUMBER'" -or $content -match "unit\s*:\s*""NUMBER"""
Write-Host ("contains unit:'NUMBER'? {0}" -f $hasWeird)

Write-Host "Done."
