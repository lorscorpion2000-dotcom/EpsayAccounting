# E:\EpsayAccounting\deploy.ps1
\$ErrorActionPreference = "Stop"

Write-Host "🚀 شروع فرآیند استقرار امن و خودکار اپسای (Epsay Accounting Deployment)..." -ForegroundColor Green

# ۱. متوقف کردن سرویس‌های ویندوز (NSSM)
Write-Host "⏸️ در حال متوقف کردن سرویس‌های ویندوز..." -ForegroundColor Yellow
nssm stop Epsay-Backend 2>\$null
nssm stop EpsayFrontend 2>\$null

# ۲. پشتیبان‌گیری خودکار پیش از مایگریشن
Write-Host "💾 در حال اخذ پشتیبان خودکار از دیتابیس پیش از استقرار..." -ForegroundColor Cyan
if (Test-Path ".\backup-service.js") {
    node .\backup-service.js
}

# ۳. به‌روزرسانی مایگریشن‌های دیتابیس
Write-Host "🗄️ در حال اعمال مایگریشن‌های دیتابیس..." -ForegroundColor Cyan
Set-Location -Path ".\backend"
npx prisma migrate deploy

# ۴. بیلد بک‌اند (نصب کامل وابستگی‌ها برای کامپایل، سپس prune)
Write-Host "📦 در حال بیلد و آماده‌سازی بک‌اند..." -ForegroundColor Cyan
npm install
npm run build
npm prune --omit=dev

# ۵. بیلد فرانت‌اند
Write-Host "🎨 در حال بیلد فرانت‌اند..." -ForegroundColor Cyan
Set-Location -Path "..\frontend"
npm install
npm run build

# ۶. استارت مجدد سرویس‌های ویندوز
Set-Location -Path ".."
Write-Host "▶️ در حال راه‌اندازی سرویس‌های ویندوز..." -ForegroundColor Green
nssm start Epsay-Backend
nssm start EpsayFrontend

Write-Host "✅ استقرار سیستم با موفقیت به پایان رسید!" -ForegroundColor Green
