// E:\EpsayAccounting\backup-service.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_PATH || 'C:\\EpsayBackups';
const RETENTION_DAYS = 30;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function cleanDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  return rawUrl.split('?')[0];
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `epsay-db-backup-${timestamp}.sql`);

  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) dbUrl = match[1];
    }
  }

  const cleanUrl = cleanDatabaseUrl(dbUrl);
  if (!cleanUrl) {
    console.error('❌ آدرس دیتابیس (DATABASE_URL) یافت نشد.');
    return;
  }

  const cmd = `pg_dump "${cleanUrl}" -f "${backupFile}"`;

  exec(cmd, (error) => {
    if (error) {
      console.error('❌ خطا در پشتیبان‌گیری:', error.message);
      return;
    }

    if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 0) {
      console.log(`✅ پشتیبان‌گیری با موفقیت انجام شد: ${backupFile}`);
    } else {
      console.error('⚠️ فایل پشتیبان ایجاد شد اما خالی است.');
    }

    // پاک‌سازی بکاپ‌های قدیمی‌تر از ۳۰ روز
    const now = Date.now();
    fs.readdirSync(BACKUP_DIR).forEach((file) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > RETENTION_DAYS * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ بکاپ قدیمی حذف شد: ${file}`);
      }
    });
  });
}

runBackup();
