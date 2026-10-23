[CmdletBinding()]
param(
    [string]$Root = $PSScriptRoot,
    [switch]$StopServices
)

# تنظیم مسیر ریشه از مسیر فایل جاری در صورت خالی بودن
if (-not $Root) {
    $Root = $PSScriptRoot
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Epsay Accounting - Startup (Dev Environment)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# ۱) توقف سرویس‌های ویندوز فقط در صورت وجود سوییچ صریح -StopServices
if ($StopServices) {
    Write-Host "توقف سرویس‌های ویندوز (سوییچ -StopServices فعال است)..." -ForegroundColor Yellow
    Stop-Service Epsay-Backend -Force -ErrorAction SilentlyContinue
    Stop-Service Epsay-Frontend -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# ۲) بررسی هوشمند پورت‌ها با Get-NetTCPConnection و بستن فقط پروسه‌های همین پروژه
Write-Host "بررسی پورت‌های ۳۰۰۰، ۳۰۰۱ و ۵۱۷۳..." -ForegroundColor Yellow
$ports = @(3000, 3001, 5173)

foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $pidToInspect = $conn.OwningProcess
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidToInspect" -ErrorAction SilentlyContinue
            $cmdLine = $proc.CommandLine

            $isProjectProc = $false
            if ($cmdLine -and $Root -and ($cmdLine -like "*$Root*")) {
                $isProjectProc = $true
            }

            if ($isProjectProc) {
                Write-Host "   پروسه متعلق به پروژه روی پورت $p (PID: $pidToInspect) شناسایی شد - بستن پروسه..." -ForegroundColor DarkYellow
                Stop-Process -Id $pidToInspect -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Start-Sleep -Seconds 1

# ۳) بررسی آزاد بودن قطعی پورت‌ها قبل از اجرا (عدم kill سراسری)
$stillBusy = @()
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $stillBusy += "پورت $p (PID: $($conn.OwningProcess))"
    }
}

if ($stillBusy.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ امکان راه‌اندازی وجود ندارد؛ پورت‌های زیر همچنان در حال استفاده هستند:" -ForegroundColor Red
    foreach ($item in $stillBusy) {
        Write-Host "   - $item" -ForegroundColor Red
    }
    Write-Host "راهنما: در صورت تمایل به توقف سرویس‌های پس‌زمینه، اسکریپت را با سوییچ -StopServices اجرا فرمایید." -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ تمام پورت‌ها آزاد و آماده هستند." -ForegroundColor Green

# ۴) راه‌اندازی Backend
Write-Host "راه‌اندازی Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Epsay Backend'; Set-Location '$Root\backend'; Write-Host 'Backend dev...' -ForegroundColor Green; npm run start:dev"
)

# ۵) مکث برای آماده‌سازی بک‌اند
Start-Sleep -Seconds 7

# ۶) راه‌اندازی Frontend
Write-Host "راه‌اندازی Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Epsay Frontend'; Set-Location '$Root\frontend'; Write-Host 'Frontend dev...' -ForegroundColor Green; npm run dev"
)

# ۷) باز کردن مرورگر
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  کلیه سرویس‌های توسعه با موفقیت راه‌اندازی شدند" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "   Backend  : http://localhost:3000/api" -ForegroundColor White
Write-Host "   Swagger  : http://localhost:3000/api/docs" -ForegroundColor White
Write-Host "   Frontend : http://localhost:5173" -ForegroundColor White
Write-Host ""
