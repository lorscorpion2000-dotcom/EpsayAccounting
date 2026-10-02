@echo off
chcp 65001 >nul
cd /d "E:\EpsayAccounting"

echo.
echo ================================================
echo   STEP 1/2 : Database Backup
echo ================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\powershell\backup-db.ps1"

echo.
echo ================================================
echo   STEP 2/2 : Code Snapshot
echo ================================================
cd /d "E:\EpsayAccounting\backend"
node prisma\save-state.mjs

echo.
echo ================================================
echo   Paste the content of snapshot into chat
echo ================================================
echo.
pause