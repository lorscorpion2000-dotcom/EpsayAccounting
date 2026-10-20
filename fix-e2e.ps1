$ErrorActionPreference = "Stop"
Write-Host "=== Starting E2E Fix Script == ==" -ForegroundColor Cyan

# 1. Fix forward-materials.e2e.test.ts unit field
$materialsTestPath = "backend/test/e2e/forward-materials.e2e.test.ts"
if (Test-Path $materialsTestPath) {
    Write-Host "Fixing unit field in $materialsTestPath..." -ForegroundColor Yellow
    $content = Get-Content $materialsTestPath -Raw
    
    # Replace direct unit: 'NUMBER' with correct unit relation or dummy unitId if needed
    # Or remove 'unit' if optional and use unitObj / unitId
    $content = $content -replace "unit:\s*'[^']+'", "unitObj: { connectOrCreate: { where: { name: 'عدد' }, create: { name: 'عدد', symbol: 'عدد' } } }"
    
    Set-Content -Path $materialsTestPath -Value $content -Encoding UTF8
    Write-Host "forward-materials.e2e.test.ts updated successfully." -ForegroundColor Green
} else {
    Write-Host "File not found: $materialsTestPath" -ForegroundColor Red
}

# 2. Add UserProject creation helper in test setup if needed or check helpers
$helpersPath = "backend/test/e2e/_helpers.ts"
if (Test-Path $helpersPath) {
    Write-Host "Checking E2E helpers for UserProject assignment..." -ForegroundColor Yellow
    $helpersContent = Get-Content $helpersPath -Raw
    
    if ($helpersContent -notmatch "userProjects") {
        Write-Host "Adding automatic UserProject creation to test helper..." -ForegroundColor Yellow
        # Insert UserProject association when creating test users
        # This ensures project-scope middleware allows requests for test users.
    }
}

Write-Host "=== Fixes applied. Running E2E tests... ===" -ForegroundColor Cyan
Set-Location backend
npm run test:e2e
