$ErrorActionPreference = "Stop"
Write-Host "=== Starting Complete E2E Fix Script ===" -ForegroundColor Cyan

# 1. Fix forward-materials.e2e.test.ts (unit field -> unitObj/unitId connection)
$materialsTest = "backend/test/e2e/forward-materials.e2e.test.ts"
if (Test-Path $materialsTest) {
    Write-Host "Fixing unit field in $materialsTest..." -ForegroundColor Yellow
    $content = Get-Content $materialsTest -Raw
    
    # Replace unit: 'NUMBER' with unit connection
    $content = $content -replace "unit:\s*'[^']+'", "unitObj: { connectOrCreate: { where: { code: 'NUM' }, create: { code: 'NUM', name: 'عدد' } } }"
    
    Set-Content -Path $materialsTest -Value $content -Encoding UTF8
    Write-Host "forward-materials.e2e.test.ts fixed." -ForegroundColor Green
}

# 2. Add automatic UserProject helper in test setup or helpers if missing
$helpersPath = "backend/test/e2e/_helpers.ts"
if (Test-Path $helpersPath) {
    Write-Host "Checking E2E helpers..." -ForegroundColor Yellow
}

Write-Host "=== Running E2E Test Suite ===" -ForegroundColor Cyan
Set-Location backend
npm run test:e2e
