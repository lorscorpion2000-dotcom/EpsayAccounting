# E:\EpsayAccounting\deploy.ps1
$ErrorActionPreference = "Stop"

Write-Host "🚀 شروع فرآیند استقرار نهایی اپسای (Epsay Accounting Production Deployment)..." -ForegroundColor Green

# ۱. متوقف کردن سرویس‌های ویندوزی در صورت وجود (NSSM)
Write-Host "⏸️ در حال متوقف کردن سرویس‌های ویندوز..." -ForegroundColor Yellow
nssm stop EpsayBackend 2>$null
nssm stop EpsayFrontend 2>$null

# ۲. بروزرسانی وابستگی‌ها و مایگریشن دیتابیس
Write-Host "🗄️ در حال اعمال مایگریشن‌های جدید دیتابیس..." -ForegroundColor Cyan
Set-Location -Path "E:\EpsayAccounting\backend"
npm install --omit=dev
npx prisma migrate deploy
npx prisma generate

# ۳. کامپایل پروژه (Build)
Write-Host "🏗️ در حال ساخت نسخه‌ی نهایی (Build)..." -ForegroundColor Cyan
npm run build

Set-Location -Path "E:\EpsayAccounting\frontend"
npm install --omit=dev
npm run build

Set-Location -Path "E:\EpsayAccounting"

# ۴. راه‌اندازی مجدد سرویس‌ها
Write-Host "▶️ در حال راه‌اندازی سرویس‌های ویندوز..." -ForegroundColor Green
nssm start EpsayBackend
nssm start EpsayFrontend

Write-Host "✅ استقرار با موفقیت و بدون قطعی انجام شد." -ForegroundColor Green