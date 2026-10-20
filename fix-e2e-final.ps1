$ErrorActionPreference = "Stop"
Write-Host "=== E2E FINAL FIX START (v6 - remaining three files) ===" -ForegroundColor Cyan

$backendDir = Join-Path (Get-Location) "backend"
if (-not (Test-Path $backendDir)) {
    throw "backend folder not found. Please run from E:\EpsayAccounting"
}
$e2eDir = Join-Path $backendDir "test\e2e"

# ============================================
# 1) اصلاح forward-progress-equipment.e2e.test.ts (تبدیل unit به unitId در wbsItem)
# ============================================
$fpePath = Join-Path $e2eDir "forward-progress-equipment.e2e.test.ts"
if (Test-Path $fpePath) {
    Write-Host "Patching: forward-progress-equipment.e2e.test.ts" -ForegroundColor Yellow
    $c = Get-Content $fpePath -Raw -Encoding UTF8
    if ($c -match "unit:\s*'مترمربع'") {
        $oldWbs = @"
    const wbs = await prisma.wbsItem.create({
      data: {
        projectId,
        code: 'E2E-WBS-' + Date.now(),
        title: 'E2E WBS Item',
        level: 'WORK_PACKAGE',
        unit: 'مترمربع',
        quantity: 100,
      },
    });
"@
        $newWbs = @"
    const unitObj = await prisma.unit.upsert({
      where: { code: 'M2' },
      update: {},
      create: { code: 'M2', name: 'مترمربع' },
    });
    const wbs = await prisma.wbsItem.create({
      data: {
        projectId,
        code: 'E2E-WBS-' + Date.now(),
        title: 'E2E WBS Item',
        level: 'WORK_PACKAGE',
        unitId: unitObj.id,
        quantity: 100,
      },
    });
"@
        $c = $c.Replace($oldWbs, $newWbs)
        Set-Content -Path $fpePath -Value $c -Encoding UTF8
        Write-Host "  -> wbsItem unit patched." -ForegroundColor Green
    }
}

# ============================================
# 2) اصلاح procurement-full-chain.e2e.test.ts (تبدیل unit به unitId در item)
# ============================================
$pfcPath = Join-Path $e2eDir "procurement-full-chain.e2e.test.ts"
if (Test-Path $pfcPath) {
    Write-Host "Patching: procurement-full-chain.e2e.test.ts" -ForegroundColor Yellow
    $c = Get-Content $pfcPath -Raw -Encoding UTF8
    if ($c -match "unit:\s*'NUMBER'") {
        $oldItem = @"
if (!item) item = await prisma.item.create({
  data: { code: 'E2E-IT-' + Date.now(), name: 'E2E Item', type: 'MATERIAL', unit: 'NUMBER', isActive: true } as any,
});
"@
        $newItem = @"
if (!item) {
  const unitObj = await prisma.unit.upsert({
    where: { code: 'NUMBER' },
    update: {},
    create: { code: 'NUMBER', name: 'عدد' },
  });
  item = await prisma.item.create({
    data: { code: 'E2E-IT-' + Date.now(), name: 'E2E Item', type: 'MATERIAL', unitId: unitObj.id, isActive: true },
  });
}
"@
        $c = $c.Replace($oldItem, $newItem)
        Set-Content -Path $pfcPath -Value $c -Encoding UTF8
        Write-Host "  -> procurement-full-chain item.create patched." -ForegroundColor Green
    }
}

# ============================================
# 3) تزریق UserProject در procurement-chain.e2e.test.ts (رفع 403)
# ============================================
$prChainPath = Join-Path $e2eDir "procurement-chain.e2e.test.ts"
if (Test-Path $prChainPath) {
    Write-Host "Patching: procurement-chain.e2e.test.ts" -ForegroundColor Yellow
    $c = Get-Content $prChainPath -Raw -Encoding UTF8
    if ($c -match "const svRes = await.*request.*login" -and -not $c.Contains("userProject.upsert")) {
        # پیدا کردن محل لاگین یا ساخت SV و تزریق اتصال پروژه
        $target = "const svToken = svRes.body.accessToken;"
        if ($c.Contains($target)) {
            $inject = @"
    await prisma.userProject.upsert({
      where: { userId_projectId: { userId: sv.id, projectId } },
      update: {},
      create: { userId: sv.id, projectId },
    }).catch(() => {});

    const svToken = svRes.body.accessToken;
"@
            $c = $c.Replace($target, $inject)
            Set-Content -Path $prChainPath -Value $c -Encoding UTF8
            Write-Host "  -> UserProject upsert injected into procurement-chain." -ForegroundColor Green
        }
    }
}

# ============================================
# 4) اجرای مجدد تست‌های E2E
# ============================================
Write-Host "`n=== RUNNING E2E TESTS ===" -ForegroundColor Cyan
Set-Location $backendDir
npm run test:e2e
Set-Location ..
Write-Host "=== DONE ===" -ForegroundColor Cyan
