import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\scripts\\powershell\\backup-db.ps1';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

let txt = fs.readFileSync(file, 'utf8');

// چک حجم رو منتقل کن قبل از رمزنگاری + روی فایل enc بعدش
const oldCheck = `# هشدار اگر حجم غیرعادی کم بود
if ((Get-Item $outFile).Length -lt 50KB) {
    Write-Log "WARN: backup file unusually small ($sizeMB MB)" 'WARN'
    Send-Telegram "حجم بکاپ غیرعادی کم است: $sizeMB MB" 'WARN'
}`;

// حذف چک قدیمی (چون الان بعد از encrypt میاد و فایل نیست)
if (txt.includes(oldCheck)) {
  txt = txt.replace(oldCheck, `# هشدار حجم غیرعادی کم — روی فایل اصلی (قبل از رمزنگاری بررسی می‌شود)`);
  console.log('✅ چک قدیمی حذف شد');
}

// اضافه کردن چک جدید قبل از encryption
const encryptionMarker = `# --- Encryption (AES-256-GCM) ---`;

const newCheck = `# هشدار اگر حجم غیرعادی کم بود (روی فایل اصلی)
if (Test-Path $outFile) {
    $rawSize = (Get-Item $outFile).Length
    if ($rawSize -lt 50KB) {
        Write-Log "WARN: backup file unusually small ($sizeMB MB)" 'WARN'
        Send-Telegram "حجم بکاپ غیرعادی کم است: $sizeMB MB" 'WARN'
    }
}

# --- Encryption (AES-256-GCM) ---`;

if (txt.includes(encryptionMarker)) {
  txt = txt.replace(encryptionMarker, newCheck);
  console.log('✅ چک جدید قبل از رمزنگاری اضافه شد');
} else {
  console.log('⚠️ marker encryption پیدا نشد — دستی چک کن');
}

fs.writeFileSync(file, txt, 'utf8');
console.log('\n=== DONE ✅ ===');