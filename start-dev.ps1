$Root = "E:\EpsayAccounting"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Epsay Accounting - Startup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1) Stop NSSM services
Write-Host "Stopping NSSM services..." -ForegroundColor Yellow
Stop-Service Epsay-Backend -Force -ErrorAction SilentlyContinue
Stop-Service Epsay-Frontend -Force -ErrorAction SilentlyContinue

# 2) Kill old node.exe
Write-Host "Killing old node.exe..." -ForegroundColor Yellow
cmd /c "taskkill /F /IM node.exe /T" 2>$null
Start-Sleep -Seconds 2

# 3) Free ports (with orphan serve cleanup + verify)
Write-Host "Checking ports (with orphan serve cleanup)..." -ForegroundColor Yellow

# 3.1) Kill orphan 'serve dist' processes (children left by stopped NSSM)
$orphans = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $Root = "E:\EpsayAccounting"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Epsay Accounting - Startup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1) Stop NSSM services
Write-Host "Stopping NSSM services..." -ForegroundColor Yellow
Stop-Service Epsay-Backend -Force -ErrorAction SilentlyContinue
Stop-Service Epsay-Frontend -Force -ErrorAction SilentlyContinue

# 2) Kill old node.exe
Write-Host "Killing old node.exe..." -ForegroundColor Yellow
cmd /c "taskkill /F /IM node.exe /T" 2>$null
Start-Sleep -Seconds 2

# 3) Free ports
Write-Host "Checking ports..." -ForegroundColor Yellow
$ports = @(3000, 3001, 5173)
foreach ($p in $ports) {
  $line = netstat -ano | Select-String ":$p.*LISTENING" | Select-Object -First 1
  if ($line) {
    $procId = ($line -split '\s+')[-1]
    Write-Host "   Port $p held by PID $procId - killing..." -ForegroundColor DarkYellow
    taskkill /F /PID $procId 2>$null | Out-Null
  }
}
Start-Sleep -Seconds 1

# 4) Start Backend
Write-Host "Starting Backend (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$Host.UI.RawUI.WindowTitle = 'Epsay Backend :3001'; Set-Location '$Root\backend'; Write-Host 'Backend dev...' -ForegroundColor Green; npm run start:dev"
)

# 5) Wait
Start-Sleep -Seconds 7

# 6) Start Frontend
Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$Host.UI.RawUI.WindowTitle = 'Epsay Frontend :5173'; Set-Location '$Root\frontend'; Write-Host 'Frontend dev...' -ForegroundColor Green; npm run dev"
)

# 7) Open browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  All services are running" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   Backend  : http://localhost:3001/api" -ForegroundColor White
Write-Host "   Swagger  : http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "   To stop: stop-dev.ps1" -ForegroundColor Gray
Write-Host "".CommandLine -match 'serve.*dist|-s dist' })
foreach ($o in $orphans) {
  Write-Host "   Killing orphan serve PID $($o.ProcessId)" -ForegroundColor DarkYellow
  Stop-Process -Id $o.ProcessId -Force -ErrorAction SilentlyContinue
}
if ($orphans.Count -gt 0) { Start-Sleep -Seconds 1 }

# 3.2) Kill whatever holds our ports
$ports = @(3000, 3001, 5173)
foreach ($p in $ports) {
  $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if (-not $conn) { continue }
  $procId = $conn.OwningProcess
  Write-Host "   Port $p held by PID $procId - killing..." -ForegroundColor DarkYellow
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
  } catch {
    Write-Host "   X PID $procId on port $p is SYSTEM-owned - admin required" -ForegroundColor Red
    Write-Host "     Re-run this script from 'Run as administrator'" -ForegroundColor Yellow
    exit 1
  }
}
Start-Sleep -Seconds 1

# 3.3) Verify ports are truly free - fail loud instead of double-starting
$stillBusy = @()
foreach ($p in $ports) {
  $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($conn) { $stillBusy += "port $p (PID $($conn.OwningProcess))" }
}
if ($stillBusy.Count -gt 0) {
  Write-Host "X Cannot continue - still listening: $($stillBusy -join ', ')" -ForegroundColor Red
  Write-Host "  Close the process(es) or run from admin, then retry." -ForegroundColor Yellow
  exit 1
}
Write-Host "   OK - all ports free" -ForegroundColor Green

# 4) Start Backend
Write-Host "Starting Backend (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$Host.UI.RawUI.WindowTitle = 'Epsay Backend :3001'; Set-Location '$Root\backend'; Write-Host 'Backend dev...' -ForegroundColor Green; npm run start:dev"
)

# 5) Wait
Start-Sleep -Seconds 7

# 6) Start Frontend
Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$Host.UI.RawUI.WindowTitle = 'Epsay Frontend :5173'; Set-Location '$Root\frontend'; Write-Host 'Frontend dev...' -ForegroundColor Green; npm run dev"
)

# 7) Open browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  All services are running" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   Backend  : http://localhost:3001/api" -ForegroundColor White
Write-Host "   Swagger  : http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "   To stop: stop-dev.ps1" -ForegroundColor Gray
Write-Host ""