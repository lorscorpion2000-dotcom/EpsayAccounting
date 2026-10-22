param(
  [Parameter(Mandatory=$false)]
  [string]$BackendRoot = "E:\EpsayAccounting\backend",

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Assert-File([string]$p) {
  if (!(Test-Path $p)) { throw "File not found: $p" }
}

function Read-FileUtf8([string]$p) {
  return Get-Content -LiteralPath $p -Raw -Encoding UTF8
}

function Write-FileUtf8([string]$p, [string]$content) {
  if ($DryRun) {
    Write-Host "[DRYRUN] would write: $p"
    return
  }
  Set-Content -LiteralPath $p -Value $content -Encoding UTF8
}

function Backup-Once([string]$p) {
  $bak = "$p.bak-v16-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  if ($DryRun) {
    Write-Host "[DRYRUN] would backup: $p -> $bak"
  } else {
    Copy-Item -LiteralPath $p -Destination $bak -Force
  }
}

function Ensure-UserProjectBinding([string]$content) {
  # insert after `const sv = await prisma.user.create({ ... });`
  if ($content -match "prisma\.userProject\.(create|upsert|deleteMany)") {
    return $content # assume already handled
  }

  $needle = "const sv = await prisma.user.create({"
  $idx = $content.IndexOf($needle)
  if ($idx -lt 0) { return $content } # no sv pattern

  # find end of that statement: first occurrence of "});" after idx
  $end = $content.IndexOf("});", $idx)
  if ($end -lt 0) { return $content }
  $end = $end + 3

  $insert = @"

  // v16: bind SV to project for scope middleware (prevents 403)
  await prisma.userProject.upsert({
    where: { userId_projectId: { userId: sv.id, projectId } },
    update: {},
    create: { userId: sv.id, projectId },
  });

"@

  return $content.Insert($end, $insert)
}

function Ensure-AfterCleanupUserProject([string]$content) {
  # crude: insert before last `});` in after() block if after exists and doesn't already delete userProject
  if ($content -match "after\s*\(" -and $content -notmatch "userProject\.deleteMany") {
    $afterIdx = [regex]::Match($content, "after\s*\(\s*async\s*\(\s*\)\s*=>\s*\{").Index
    if ($afterIdx -ge 0) {
      # insert near end of after block: before the last line containing "});" that closes after()
      $m = [regex]::Matches($content, "\n\}\);\s*$", "Multiline")
      if ($m.Count -gt 0) {
        $pos = $m[$m.Count-1].Index
        $insert = @"

  // v16: cleanup UserProject binding
  try { await prisma.userProject.deleteMany({ where: { userId: sv.id, projectId } }); } catch {}

"@
        return $content.Insert($pos, $insert)
      }
    }
  }
  return $content
}

function Patch-ProcurementFullChainItemUnit([string]$content) {
  # Replace prisma.item.create({ data: {... unit: 'NUMBER' ... } as any })
  if ($content -notmatch "prisma\.item\.create\(") { return $content }

  if ($content -match "unit:\s*'NUMBER'") {
    # Ensure we have a Unit upsert snippet nearby (place it before item.create)
    if ($content -notmatch "const\s+uNumber\s*=\s*await\s+prisma\.unit\.upsert") {
      $content = $content -replace "(\s*if\s*\(!item\)\s*item\s*=\s*await\s+prisma\.item\.create\s*\(\s*\{\s*data\s*:\s*\{)",
@"
  const uNumber = await prisma.unit.upsert({
    where: { code: 'NUMBER' },
    update: {},
    create: { code: 'NUMBER', name: 'عدد' },
  });

  if (!item) item = await prisma.item.create({ data: {
"@
    }

    $content = $content -replace "unit:\s*'NUMBER'\s*,", "unitId: uNumber.id,"
    # also remove `as any` if present
    $content = $content -replace "\}\s*as\s*any\s*\}\s*\)\s*;", "} });"
  }
  return $content
}

function Patch-ForwardProgressEquipmentWbsUnit([string]$content) {
  if ($content -notmatch "prisma\.wbsItem\.create") { return $content }
  if ($content -notmatch "unit:\s*'مترمربع'") { return $content }

  if ($content -notmatch "const\s+uM2\s*=\s*await\s+prisma\.unit\.upsert") {
    # inject after projectId is known; simplest: inject after first `const projectId =`
    $content = $content -replace "(const\s+projectId\s*=\s*[^;]+;\s*)",
@"
`$1

  const uM2 = await prisma.unit.upsert({
    where: { code: 'M2' },
    update: {},
    create: { code: 'M2', name: 'مترمربع' },
  });
"@
  }

  $content = $content -replace "unit:\s*'مترمربع'\s*,", "unitId: uM2.id,"
  return $content
}

function Patch-ForwardMaterialsItemCreateBlock([string]$content) {
  # This one is special because your local file may be syntactically broken (TS1109).
  # We replace the first prisma.item.create(...) block that includes unit:'NUMBER' or unitId issues
  if ($content -notmatch "prisma\.item\.create") { return $content }

  # Ensure Unit upsert exists somewhere before item.create usage
  if ($content -notmatch "const\s+uNumber\s*=\s*await\s+prisma\.unit\.upsert") {
    $content = $content -replace "(before\s*\(\s*async\s*\(\s*\)\s*=>\s*\{)",
@"
`$1

  const uNumber = await prisma.unit.upsert({
    where: { code: 'NUMBER' },
    update: {},
    create: { code: 'NUMBER', name: 'عدد' },
  });
"@
  }

  # Replace common wrong patterns
  $content = $content -replace "unit:\s*'NUMBER'\s*,", "unitId: uNumber.id,"

  # If a previous regex patch left "unitId:" dangling, try to normalize:
  $content = $content -replace "unitId:\s*'NUMBER'\s*,", "unitId: uNumber.id,"

  return $content
}

# ---------- Target files ----------
$targets = @(
  "test\e2e\forward-attendance-petty-cash.e2e.test.ts",
  "test\e2e\forward-events.e2e.test.ts",
  "test\e2e\procurement-chain.e2e.test.ts",
  "test\e2e\procurement-full-chain.e2e.test.ts",
  "test\e2e\forward-materials.e2e.test.ts",
  "test\e2e\forward-progress-equipment.e2e.test.ts",
  "test\e2e\approvals-filter.e2e.test.ts"
) | ForEach-Object { Join-Path $BackendRoot $_ }

Write-Host "BackendRoot = $BackendRoot"
Write-Host "DryRun      = $DryRun"
Write-Host "Targets:"
$targets | ForEach-Object { Write-Host " - $_" }

foreach ($file in $targets) {
  if (!(Test-Path $file)) {
    Write-Warning "SKIP (missing): $file"
    continue
  }

  $orig = Read-FileUtf8 $file
  $new  = $orig

  # 1) Scope fix: add userProject binding + cleanup
  $new = Ensure-UserProjectBinding $new
  $new = Ensure-AfterCleanupUserProject $new

  # 2) Unit fixes where direct prisma creates exist
  if ($file -like "*forward-progress-equipment.e2e.test.ts") {
    $new = Patch-ForwardProgressEquipmentWbsUnit $new
  }
  if ($file -like "*forward-materials.e2e.test.ts") {
    $new = Patch-ForwardMaterialsItemCreateBlock $new
  }
  if ($file -like "*procurement-full-chain.e2e.test.ts") {
    $new = Patch-ProcurementFullChainItemUnit $new
  }

  if ($new -ne $orig) {
    Backup-Once $file
    Write-FileUtf8 $file $new
    Write-Host "PATCHED: $file"
  } else {
    Write-Host "NOCHANGE: $file"
  }
}

Write-Host "`nDone."
Write-Host "Next: npm test (or pnpm) in backend, or run the e2e suite that failed."
