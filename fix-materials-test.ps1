$ErrorActionPreference = "Stop"
Write-Host "=== Applying Comprehensive Fix to forward-materials.e2e.test.ts ===" -ForegroundColor Cyan

$testPath = "backend/test/e2e/forward-materials.e2e.test.ts"
if (Test-Path $testPath) {
    $content = Get-Content $testPath -Raw
    
    # 1. Fix item creation unit field -> unitObj connectOrCreate
    $content = $content -replace "unit:\s*'[^']+'", "unitObj: { connectOrCreate: { where: { code: 'NUM' }, create: { code: 'NUM', name: 'عدد', isSystem: true } } }"
    
    # 2. Add UserProject creation for SV user after creation
    if ($content -notmatch "prisma\.userProject\.create") {
        $targetStr = "const svToken = svRes.body.accessToken;"
        $replacement = @"
        // Ensure UserProject assignment for scope middleware
        await prisma.userProject.create({
            data: { userId: sv.id, projectId: projectId, role: 'SUPERVISOR' }
        }).catch(() => {});
        
        $targetStr
"@
        $content = $content -replace [System.Text.RegularExpressions.Regex]::Escape($targetStr), $replacement
    }
    
    Set-Content -Path $testPath -Value $content -Encoding UTF8
    Write-Host "forward-materials.e2e.test.ts fixed successfully." -ForegroundColor Green
} else {
    Write-Host "File not found: $testPath" -ForegroundColor Red
}

Write-Host "=== Running E2E Test Suite ===" -ForegroundColor Cyan
Set-Location backend
npm run test:e2e
