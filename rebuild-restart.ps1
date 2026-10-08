#Requires -RunAsAdministrator
Write-Host "Building backend..." -ForegroundColor Cyan
Push-Location "E:\EpsayAccounting\backend"
npm run build
Pop-Location

Write-Host "Building frontend..." -ForegroundColor Cyan
Push-Location "E:\EpsayAccounting\frontend"
npm run build
Pop-Location

Write-Host "Restarting services..." -ForegroundColor Cyan
Restart-Service Epsay-Backend
Restart-Service Epsay-Frontend

Start-Sleep -Seconds 4
Get-Service Epsay-* | Format-Table -AutoSize
Write-Host "Done!" -ForegroundColor Green