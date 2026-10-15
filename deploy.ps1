# Must run in Admin PowerShell
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Run this in PowerShell as Administrator!" -ForegroundColor Red
  exit 1
}

Stop-Service -Name "Epsay-Backend" -Force
Stop-Service -Name "Epsay-Frontend" -Force
Start-Sleep -Seconds 3

cd E:\EpsayAccounting\backend
npx prisma migrate dev
npx prisma generate
npm run build

Start-Service -Name "Epsay-Backend"

cd E:\EpsayAccounting\frontend
npm run build
Restart-Service -Name "Epsay-Frontend" -Force
Start-Sleep -Seconds 3

cd E:\EpsayAccounting
git add -A
$msg = Read-Host "Commit message"
if (-not $msg) { $msg = "wip" }
git commit -m "$msg"
git push

Write-Host "Done." -ForegroundColor Green