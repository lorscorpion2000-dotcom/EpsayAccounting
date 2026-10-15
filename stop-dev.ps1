Write-Host ""
Write-Host "Stopping dev servers..." -ForegroundColor Yellow
cmd /c "taskkill /F /IM node.exe /T" 2>$null
Write-Host "All servers stopped" -ForegroundColor Green
Write-Host ""