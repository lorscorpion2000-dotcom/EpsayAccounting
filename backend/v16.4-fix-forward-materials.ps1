param(
  [string]$BackendRoot = "E:\EpsayAccounting\backend",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$file = Join-Path $BackendRoot "test\e2e\forward-materials.e2e.test.ts"
if (!(Test-Path $file)) { throw "File not found: $file" }

function ReadUtf8([string]$p) { Get-Content -LiteralPath $p -Raw -Encoding UTF8 }
function WriteUtf8([string]$p, [string]$c) {
  if ($DryRun) { Write-Host "[DRYRUN] would write $p"; return }
  Set-Content -LiteralPath $p -Value $c -Encoding UTF8
}
function Backup([string]$p) {
  $bak = "$p.bak-v16_4-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  if ($DryRun) { Write-Host "[DRYRUN] would backup $p -> $bak" }
  else { Copy-Item -LiteralPath $p -Destination $bak -Force }
}

$content = ReadUtf8 $file
$orig = $content

# Locate the block between // item and // roles
$startToken = "// item"
$endToken   = "// roles"

$start = $content.IndexOf($startToken)
if ($start -lt 0) { throw "Could not find token: $startToken" }

$end = $content.IndexOf($endToken, $start + $startToken.Length)
if ($end -lt 0) { throw "Could not find token: $endToken (after $startToken)" }

$before = $content.Substring(0, $start)
$after  = $content.Substring($end)  # keep from // roles onward

# Clean, canonical replacement block
$replacement = @"
  // item
  // Ensure default unit exists (shared reference data)
  const unit = await prisma.unit.upsert({
    where: { code: 'NUMBER' },
    update: {},
    create: {
      code: 'NUMBER',
      name: 'عدد',
      symbol: 'No',
      isSystem: true,
      isActive: true,
    },
  });

  const item = await prisma.item.create({
    data: {
      name: 'Test Material ' + Date.now(),
      code: 'MAT-' + Math.floor(Math.random() * 100000),
      unitId: unit.id,
      categoryId: category.id,
    },
  });
  itemId = item.id;
  createdItemId = item.id;

"@

$newContent = $before + $replacement + $after

# Optional: fix mojibake occurrences globally (safe)
$newContent = $newContent.Replace("Ø¹Ø¯Ø¯", "عدد")

if ($newContent -eq $orig) {
  Write-Host "NOCHANGE: $file"
} else {
  Backup $file
  WriteUtf8 $file $newContent
  Write-Host "PATCHED: $file"
}

Write-Host "Done. Next run:"
Write-Host "  cd $BackendRoot"
Write-Host "  npm test -- test/e2e/forward-materials.e2e.test.ts"
