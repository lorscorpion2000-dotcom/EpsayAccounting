param(
  [string]$BackendRoot = "E:\EpsayAccounting\backend",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$file = Join-Path $BackendRoot "test\e2e\forward-materials.e2e.test.ts"
if (!(Test-Path $file)) { throw "File not found: $file" }

function ReadUtf8([string]$p) { Get-Content -LiteralPath $p -Raw -Encoding UTF8 }
function WriteUtf8([string]$p, [string]$c) { if(!$DryRun){ Set-Content -LiteralPath $p -Value $c -Encoding UTF8 } }
function Backup([string]$p) {
  $bak = "$p.bak-v16_5-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  if ($DryRun) { Write-Host "[DRYRUN] backup -> $bak" } else { Copy-Item -LiteralPath $p -Destination $bak -Force }
}

$content = ReadUtf8 $file
$orig = $content

# --- 1) Replace // item ... // roles block
$startToken = "// item"
$endToken   = "// roles"
$start = $content.IndexOf($startToken)
if ($start -lt 0) { throw "Could not find token: $startToken" }
$end = $content.IndexOf($endToken, $start + $startToken.Length)
if ($end -lt 0) { throw "Could not find token: $endToken (after $startToken)" }

$before = $content.Substring(0, $start)
$after  = $content.Substring($end)

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

$content = $before + $replacement + $after
$content = $content.Replace("Ø¹Ø¯Ø¯", "عدد") # optional mojibake fix

# --- 2) Ensure userProject binding exists (insert once)
if ($content -notmatch "userProject\.createMany") {
  # Insert after sv user creation block marker (best-effort)
  $marker = "// sv user"
  $idx = $content.IndexOf($marker)
  if ($idx -gt 0) {
    # insert after the next semicolon following sv user create (first ';' after marker)
    $semi = $content.IndexOf(";", $idx)
    if ($semi -gt 0) {
      $insertPos = $semi + 1
      $bindBlock = @"

  // bind users to project (project scope)
  await prisma.userProject.createMany({
    data: [
      { userId: createdAdminId!, projectId, isActive: true },
      { userId: svUserId!, projectId, isActive: true },
    ],
    skipDuplicates: true,
  });

"@
      $content = $content.Insert($insertPos, $bindBlock)
    }
  }
}

# --- 3) Ensure after() cleanup removes userProject first (insert once)
if ($content -notmatch "userProject\.deleteMany") {
  $afterMarker = "after(async () => {"
  $aidx = $content.IndexOf($afterMarker)
  if ($aidx -gt 0) {
    $brace = $content.IndexOf("{", $aidx)
    if ($brace -gt 0) {
      $insertPos2 = $brace + 1
      $cleanup = @"

  // cleanup project bindings first
  try {
    await prisma.userProject.deleteMany({
      where: {
        projectId,
        userId: { in: [createdAdminId, svUserId].filter(Boolean) },
      },
    });
  } catch {}

"@
      $content = $content.Insert($insertPos2, $cleanup)
    }
  }
}

if ($content -eq $orig) {
  Write-Host "NOCHANGE: $file"
} else {
  Backup $file
  if ($DryRun) { Write-Host "[DRYRUN] PATCH would be written." } else { WriteUtf8 $file $content }
  Write-Host "PATCHED: $file"
}

Write-Host "Done. Next run:"
Write-Host "  cd $BackendRoot"
Write-Host "  npm test -- test/e2e/forward-materials.e2e.test.ts"
