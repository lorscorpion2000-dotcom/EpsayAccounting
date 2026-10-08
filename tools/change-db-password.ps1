# change-db-password.ps1
# Change postgres user password and update .env
param(
  [string]$NewPassword
)

$ErrorActionPreference = 'Stop'
$envPath = "E:\EpsayAccounting\backend\.env"
$STAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Password
if (-not $NewPassword) {
  $secure = Read-Host "New DB password (min 16 chars)" -AsSecureString
  $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $NewPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

if ($NewPassword.Length -lt 16) {
  Write-Host "[FAIL] Password must be at least 16 chars"
  exit 1
}

if ($NewPassword -match '[\s"]') {
  Write-Host "[FAIL] Password must not contain whitespace or double-quote"
  exit 1
}

Write-Host ""
Write-Host "About to change DB password:"
Write-Host "   user: postgres"
Write-Host "   new password length: $($NewPassword.Length)"
Write-Host ""
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne 'YES') { Write-Host "Cancelled"; exit 0 }

# Backup .env
Copy-Item $envPath "$envPath.bak-$STAMP"
Write-Host "[OK] backup: .env.bak-$STAMP"

# Read .env
$envContent = Get-Content $envPath -Raw -Encoding UTF8
$urlMatch = [regex]::Match($envContent, 'DATABASE_URL\s*=\s*"([^"]+)"')
if (-not $urlMatch.Success) {
  Write-Host "[FAIL] DATABASE_URL not found in .env"
  exit 1
}
$oldUrl = $urlMatch.Groups[1].Value

$parse = [regex]::Match($oldUrl, '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)')
if (-not $parse.Success) {
  Write-Host "[FAIL] Could not parse DATABASE_URL"
  exit 1
}
$dbUser = $parse.Groups[1].Value
$oldPass = $parse.Groups[2].Value
$dbHost = $parse.Groups[3].Value
$dbPort = $parse.Groups[4].Value
$dbName = $parse.Groups[5].Value

Write-Host "   host: ${dbHost}:${dbPort}  db: $dbName  user: $dbUser"

# Change password in PostgreSQL
$env:PGPASSWORD = $oldPass
$sql = "ALTER USER ""$dbUser"" WITH PASSWORD '$NewPassword';"

Write-Host "Changing password in PostgreSQL..."
$result = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $sql 2>&1
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] ALTER USER failed:"
  Write-Host $result
  exit 1
}
Write-Host "[OK] DB password changed"

# Update .env (URL-encoded)
Add-Type -AssemblyName System.Web
$encoded = [System.Web.HttpUtility]::UrlEncode($NewPassword)
$newUrl = "postgresql://${dbUser}:${encoded}@${dbHost}:${dbPort}/${dbName}?schema=public"

$newEnvContent = $envContent.Replace($oldUrl, $newUrl)
Set-Content -Path $envPath -Value $newEnvContent -Encoding UTF8 -NoNewline
Write-Host "[OK] .env updated"

# Verify new password
$env:PGPASSWORD = $NewPassword
$verify = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT 1 AS ok;" 2>&1
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] New password verification failed!"
  Write-Host "Restoring .env from backup..."
  Copy-Item "$envPath.bak-$STAMP" $envPath -Force
  Write-Host "[WARN] .env restored but DB password IS ALREADY CHANGED"
  Write-Host "   Manual fix required."
  exit 1
}

Write-Host "[OK] New password verified"
Write-Host ""
Write-Host "========================================"
Write-Host "  DB password changed successfully"
Write-Host "========================================"
Write-Host ""
Write-Host "Next steps (as admin):"
Write-Host "  Restart-Service Epsay-Backend -Force"
Write-Host "  Start-Sleep 10"
Write-Host "  Invoke-RestMethod http://localhost:3000/api/health"
Write-Host ""
Write-Host "Also update password in pgAdmin and VS Code extensions."
