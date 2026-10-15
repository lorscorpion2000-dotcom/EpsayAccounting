# ============================================================
# Epsay Accounting - Full Deploy
# Run in Admin PowerShell
# ============================================================

$Root = "E:\EpsayAccounting"

Write-Host ""
Write-Host "=== Epsay Deploy ===" -ForegroundColor Cyan
Write-Host ""

# 0) Kill stray node processes
Write-Host "[0/7] Cleaning stray node..." -ForegroundColor Yellow
cmd /c "taskkill /F /IM node.exe /T" 2>$null
Start-Sleep -Seconds 2

# 1) Stop NSSM services
Write-Host "[1/7] Stopping services..." -ForegroundColor Yellow
Stop-Service -Name "Epsay-Backend" -Force -ErrorAction SilentlyContinue
Stop-Service -Name "Epsay-Frontend" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# 2) Prisma migrate + generate
Write-Host "[2/7] Prisma migrate + generate..." -ForegroundColor Cyan
Set-Location "$Root\backend"
npx prisma migrate dev
npx prisma generate

# 3) Build backend
Write-Host "[3/7] Building backend..." -ForegroundColor Cyan
npm run build

# 4) Start backend service
Write-Host "[4/7] Starting backend service..." -ForegroundColor Cyan
Start-Service -Name "Epsay-Backend"
Start-Sleep -Seconds 3

# 5) Build frontend + start service
Write-Host "[5/7] Building frontend..." -ForegroundColor Cyan
Set-Location "$Root\frontend"
npm run build
Start-Service -Name "Epsay-Frontend"
Start-Sleep -Seconds 3

# 6) Commit + push
Write-Host "[6/7] Git commit + push..." -ForegroundColor Cyan
Set-Location $Root
git add -A
$msg = Read-Host "Commit message (Enter = 'wip')"
if (-not $msg) { $msg = "wip" }
git commit -m "$msg"
git push

# 7) Summary
Write-Host ""
Write-Host "[7/7] === Done ===" -ForegroundColor Green
Write-Host "   Backend  : http://localhost:3000" -ForegroundColor White
Write-Host "   Swagger  : http://localhost:3000/api/docs" -ForegroundColor White
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor White
Write-Host ""