param(
  [Parameter(Mandatory=$false)]
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
  $bak = "$p.bak-v16_2-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  if ($DryRun) { Write-Host "[DRYRUN] would backup $p -> $bak" }
  else { Copy-Item -LiteralPath $p -Destination $bak -Force }
}

$content = ReadUtf8 $file
$orig = $content

# ---- 1) Quote secret-xxxx placeholders used as raw tokens (syntax breaker) ----
# bcrypt.hash(secret-xxxx, 10)  -> bcrypt.hash('secret-xxxx', 10)
$content = [regex]::Replace(
  $content,
  "bcrypt\.hash\(\s*(secret-[0-9a-fA-F]{8})\s*,\s*10\s*\)",
  "bcrypt.hash('$1', 10)"
)

# password: secret-xxxx -> password: 'secret-xxxx'
$content = [regex]::Replace(
  $content,
  "password\s*:\s*(secret-[0-9a-fA-F]{8})",
  "password: '$1'"
)

# ---- 2) Replace the whole prisma.item.create block inside before() to a safe one ----
# We look for: const item = await prisma.item.create({ ... }); (first occurrence)
$patternItemBlock = "(?s)^\s*const\s+item\s*=\s*await\s+prisma\.item\.create\s*\(\s*\{\s*data\s*:\s*\{.*?\}\s*,\s*\}\s*\)\s*;\s*"

$replacementItemBlock = @"
  // item
  const unit = await prisma.unit.upsert({
    where: { code: 'NUMBER' },
    update: {},
    create: { code: 'NUMBER', name: 'عدد' },
  });

  const item = await prisma.item.create({
    data: {
      code: 'E2E-ITM-' + Date.now(),
      name: 'E2E Materials Item',
      type: 'MATERIAL',
      unitId: unit.id,
      isActive: true,
    },
  });

"@

# Only patch inside before(async()=>{ ... }) region to avoid accidental replacement in tests
$beforeMatch = [regex]::Match($content, "(?s)before\s*\(\s*async\s*\(\s*\)\s*=>\s*\{.*?\n\}\s*\)\s*;")
if (!$beforeMatch.Success) { throw "Could not locate before(async()=>{...}); block." }

$beforeBlock = $beforeMatch.Value
$beforeOrig  = $beforeBlock

if ([regex]::IsMatch($beforeBlock, $patternItemBlock, "Multiline")) {
  $beforeBlock = [regex]::Replace($beforeBlock, $patternItemBlock, $replacementItemBlock, "Multiline", 1)
} else {
  # fallback: patch scalar unit if item block wasn't matched
  $beforeBlock = $beforeBlock -replace "unit\s*:\s*'NUMBER'\s*,", "unitId: unit.id,"
  if ($beforeBlock -notmatch "prisma\.unit\.upsert") {
    throw "Item create block not found with regex AND no unit.upsert present; please paste lines around item.create."
  }
}

# Put back the modified before block
$content = $content.Substring(0, $beforeMatch.Index) + $beforeBlock + $content.Substring($beforeMatch.Index + $beforeMatch.Length)

# ---- 3) Report & write ----
if ($content -ne $orig) {
  Backup $file
  WriteUtf8 $file $content
  Write-Host "PATCHED: $file"
} else {
  Write-Host "NOCHANGE: $file"
}

Write-Host "Done. Next run:"
Write-Host "  cd $BackendRoot"
Write-Host "  npm test -- test/e2e/forward-materials.e2e.test.ts"
