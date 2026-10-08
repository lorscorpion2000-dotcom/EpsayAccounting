import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\scripts\\powershell\\backup-db.ps1';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup: ${file}.bak-${STAMP}`);

let txt = fs.readFileSync(file, 'utf8');

// ۱) Telegram config — استفاده از helper Node
const oldTg = `$TelegramConfigPath = Join-Path $Root "tools\\telegram.config.json"
$TelegramConfig = $null
if (Test-Path $TelegramConfigPath) {
    try {
        $TelegramConfig = Get-Content $TelegramConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch { }
}`;

const newTg = `$TelegramConfig = $null
try {
    $helper = Join-Path $Root "tools\\get-telegram-config.mjs"
    if (Test-Path $helper) {
        $raw = & node $helper 2>$null
        if ($raw) {
            $TelegramConfig = $raw | ConvertFrom-Json
        }
    }
} catch {
    # silent — اگه تلگرام کار نکرد، بکاپ رو متوقف نمی‌کنیم
}`;

if (txt.includes(oldTg)) {
  txt = txt.replace(oldTg, newTg);
  console.log('✅ telegram config از enc helper');
} else {
  console.log('⚠️ الگوی telegram config پیدا نشد');
}

// ۲) رمزنگاری بعد از pg_dump
const oldSize = `$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Log "Saved: db-$stamp.sql ($sizeMB MB)" 'OK'`;

const newSize = `$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)

# --- Encryption (AES-256-GCM) ---
$encryptor = Join-Path $Root "tools\\encrypt-backup.mjs"
if (Test-Path $encryptor) {
    Write-Log "Encrypting backup..." 'INFO'
    $encResult = & node $encryptor $outFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Encrypted: db-$stamp.sql.enc ($sizeMB MB)" 'OK'
    } else {
        Write-Log "Encryption failed: $encResult" 'ERROR'
        Send-Telegram "رمزنگاری بکاپ ناموفق بود" 'ERROR'
        # فایل plaintext باقی می‌مونه برای بررسی دستی
        exit 1
    }
} else {
    Write-Log "Encryptor not found - plaintext backup remains" 'WARN'
}

# آمار
$allEnc = Get-ChildItem $BackupDir -Filter "db-*.sql.enc" -ErrorAction SilentlyContinue
$totalMB = [math]::Round(($allEnc | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Log "Total encrypted backups: $($allEnc.Count) files, $totalMB MB"
Write-Log "=== Backup finished ==="`;

if (txt.includes(oldSize)) {
  txt = txt.replace(oldSize, newSize);
  console.log('✅ رمزنگاری بعد از pg_dump اضافه شد');
} else {
  console.log('⚠️ الگوی size پیدا نشد — دستی چک کن');
}

// ۳) حذف cleanup قدیمی (چون الان .sql.enc هست)
const oldCleanup = `Get-ChildItem $BackupDir -Filter "db-*.sql" -ErrorAction SilentlyContinue |`;

const newCleanup = `Get-ChildItem $BackupDir -Filter "db-*.sql*" -ErrorAction SilentlyContinue |`;

if (txt.includes(oldCleanup)) {
  txt = txt.replace(oldCleanup, newCleanup);
  console.log('✅ cleanup برای .sql.enc هم اجرا می‌شه');
}

fs.writeFileSync(file, txt, 'utf8');
console.log('\n=== DONE ✅ ===');