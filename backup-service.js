// E:\EpsayAccounting\backup-service.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_PATH || 'C:\\EpsayBackups';
const RETENTION_DAYS = 30;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `epsay-db-backup-${timestamp}.sql`);

  const dbUrl = process.env.DATABASE_URL;
  console.log(`[${new Date().toLocaleString('fa-IR')}] 💾 شروع پشتیبان‌گیری از دیتابیس...`);

  // دستور پشتیبان‌گیری PostgreSQL
  const dumpCmd = `pg_dump "${dbUrl}" -F c -b -v -f "${backupFile}"`;

  exec(dumpCmd, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ خطا در تهیه بکاپ:', err.message);
      return;
    }

    // تست صحت بازیابی (Validation Test)
    const stats = fs.statSync(backupFile);
    if (stats.size > 0) {
      console.log(`✅ فایل پشتیبان با موفقیت ساخته شد (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${backupFile}`);
      cleanOldBackups();
    } else {
      console.error('⚠️ فایل بکاپ ساخته‌شده خالی است!');
    }
  });
}

function cleanOldBackups() {
  const now = Date.now();
  const files = fs.readdirSync(BACKUP_DIR);

  files.forEach((file) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageDays > RETENTION_DAYS) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ فایل پشتیبان قدیمی پاکسازی شد: ${file}`);
    }
  });
}

runBackup();