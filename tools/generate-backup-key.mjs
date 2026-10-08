import crypto from 'node:crypto';
import fs from 'node:fs';

const envPath = 'E:\\EpsayAccounting\\backend\\.env';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const newKey = crypto.randomBytes(32).toString('base64');

fs.copyFileSync(envPath, `${envPath}.bak-${STAMP}`);
console.log(`✅ backup: .env.bak-${STAMP}`);

let env = fs.readFileSync(envPath, 'utf8');

if (env.includes('BACKUP_ENCRYPTION_KEY')) {
  env = env.replace(
    /BACKUP_ENCRYPTION_KEY\s*=\s*.+/,
    `BACKUP_ENCRYPTION_KEY=${newKey}`
  );
  console.log('✅ کلید backup جایگزین شد');
} else {
  env = env.trimEnd() + '\n\n# کلید رمزنگاری backup های دیتابیس\nBACKUP_ENCRYPTION_KEY=' + newKey + '\n';
  console.log('✅ کلید backup اضافه شد');
}

fs.writeFileSync(envPath, env, 'utf8');
console.log('');
console.log('⚠️ بکاپ کلید رو جای امن نگه‌دار (مثل CONFIG_ENCRYPTION_KEY)');