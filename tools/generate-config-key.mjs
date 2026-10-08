// تولید کلید رمزنگاری config
import crypto from 'node:crypto';
import fs from 'node:fs';

const envPath = 'E:\\EpsayAccounting\\backend\\.env';

const key = crypto.randomBytes(32).toString('base64');
console.log('کلید تولید شد (32 بایت → base64):');
console.log(key);
console.log('');

// چک کن که از قبل هست
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

if (env.includes('CONFIG_ENCRYPTION_KEY')) {
  console.log('⚠️ CONFIG_ENCRYPTION_KEY از قبل تو .env هست');
  const m = env.match(/CONFIG_ENCRYPTION_KEY\s*=\s*(.*)/);
  console.log('مقدار فعلی:', m[1].slice(0, 20) + '...');
  console.log('');
  console.log('اگه می‌خوای کلید جدید بذاری، خط قبلی رو حذف کن و این خط رو اضافه کن:');
  console.log('CONFIG_ENCRYPTION_KEY=' + key);
} else {
  // بکاپ + اضافه کردن
  const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.copyFileSync(envPath, `${envPath}.bak-${STAMP}`);
  console.log(`✅ backup: .env.bak-${STAMP}`);

  env = env.trimEnd() + '\n\n# کلید رمزنگاری config ها (DO NOT COMMIT)\nCONFIG_ENCRYPTION_KEY=' + key + '\n';
  fs.writeFileSync(envPath, env, 'utf8');
  console.log('✅ کلید به .env اضافه شد');
}

console.log('');
console.log('⚠️ این کلید رو یه جای امن backup بگیر — بدون اون نمی‌تونی config رمزگشایی کنی!');