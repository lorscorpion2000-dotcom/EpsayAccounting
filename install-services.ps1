# install-services.ps1 — Run as Administrator
#Requires -RunAsAdministrator

$NSSM = "C:\ProgramData\chocolatey\bin\nssm.exe"
if (!(Test-Path $NSSM)) {
    $NSSM = "C:\ProgramData\chocolatey\lib\NSSM\tools\nssm.exe"
}
if (!(Test-Path $NSSM)) {
    Write-Host "NSSM not found" -ForegroundColor Red
    exit 1
}

Write-Host "NSSM: $NSSM" -ForegroundColor Green
New-Item -ItemType Directory -Force -Path "E:\EpsayAccounting\logs" | Out-Null

# Remove old
foreach ($svc in @("Epsay-Backend", "Epsay-Frontend")) {
    $existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Removing old: $svc" -ForegroundColor Yellow
        & $NSSM stop $svc 2>$null | Out-Null
        Start-Sleep -Seconds 1
        & $NSSM remove $svc confirm 2>$null | Out-Null
    }
}

# ─── Backend service ───
Write-Host "Installing Epsay-Backend..." -ForegroundColor Cyan
& $NSSM install Epsay-Backend "node.exe" "E:\EpsayAccounting\backend\dist\main.js"
& $NSSM set Epsay-Backend AppDirectory "E:\EpsayAccounting\backend"
& $NSSM set Epsay-Backend AppEnvironmentExtra "NODE_ENV=production" "PORT=3000"
& $NSSM set Epsay-Backend AppStdout "E:\EpsayAccounting\logs\backend-out.log"
& $NSSM set Epsay-Backend AppStderr "E:\EpsayAccounting\logs\backend-err.log"
& $NSSM set Epsay-Backend AppRotateFiles 1
& $NSSM set Epsay-Backend AppRotateBytes 10485760
& $NSSM set Epsay-Backend Start SERVICE_AUTO_START
& $NSSM set Epsay-Backend AppExit Default Restart
& $NSSM set Epsay-Backend AppRestartDelay 5000
& $NSSM set Epsay-Backend AppThrottle 10000

# ─── Frontend service ───
Write-Host "Installing Epsay-Frontend..." -ForegroundColor Cyan
# serve path — .cmd بگیر (nssm نمی‌تونه .ps1 رو اجرا کنه)
$SERVE = Join-Path $env:APPDATA "npm\serve.cmd"
if (!(Test-Path $SERVE)) {
    $SERVE = "C:\Users\M.Amini\AppData\Roaming\npm\serve.cmd"
}
if (!(Test-Path $SERVE)) {
    Write-Host "serve.cmd not found. Run: npm install -g serve" -ForegroundColor Red
    exit 1
}
Write-Host "serve: $SERVE" -ForegroundColor Green

& $NSSM install Epsay-Frontend $SERVE "-s dist -l 5173"
& $NSSM set Epsay-Frontend AppDirectory "E:\EpsayAccounting\frontend"
& $NSSM set Epsay-Frontend AppStdout "E:\EpsayAccounting\logs\frontend-out.log"
& $NSSM set Epsay-Frontend AppStderr "E:\EpsayAccounting\logs\frontend-err.log"
& $NSSM set Epsay-Frontend AppRotateFiles 1
& $NSSM set Epsay-Frontend AppRotateBytes 10485760
& $NSSM set Epsay-Frontend Start SERVICE_AUTO_START
& $NSSM set Epsay-Frontend AppExit Default Restart
& $NSSM set Epsay-Frontend AppRestartDelay 5000
& $NSSM set Epsay-Frontend AppThrottle 10000

# ─── Firewall ───
Write-Host "Configuring firewall..." -ForegroundColor Cyan
Remove-NetFirewallRule -DisplayName "Epsay Backend 3000" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Epsay Frontend 5173" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Epsay Backend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Epsay Frontend 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow | Out-Null

# ─── Start services ───
Write-Host "Starting services..." -ForegroundColor Cyan
& $NSSM start Epsay-Backend
& $NSSM start Epsay-Frontend

Start-Sleep -Seconds 4

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Services installed and started!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Get-Service Epsay-* | Format-Table -AutoSize
Write-Host ""
Write-Host "  Frontend: http://172.20.18.20:5173" -ForegroundColor Cyan
Write-Host "  Backend:  http://172.20.18.20:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ الان می‌توانید VSCode را ببندید" -ForegroundColor Yellow
Write-Host ""
Write-Host "  لاگ‌ها:" -ForegroundColor Yellow
Write-Host "    Get-Content E:\EpsayAccounting\logs\backend-err.log -Tail 30" -ForegroundColor White
Write-Host "    Get-Content E:\EpsayAccounting\logs\frontend-err.log -Tail 30" -ForegroundColor White