import fs from 'node:fs';

const envPath = 'E:\\EpsayAccounting\\backend\\.env';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(envPath, `${envPath}.bak-${STAMP}`);
console.log(`✅ backup: .env.bak-${STAMP}`);

let env = fs.readFileSync(envPath, 'utf8');

// MAX_FILE_SIZE_MB اگه نبود
if (!env.includes('MAX_FILE_SIZE_MB')) {
  env = env.trimEnd() + '\nMAX_FILE_SIZE_MB=20\n';
  console.log('✅ MAX_FILE_SIZE_MB=20 اضافه شد');
}

// MAX_FILES_PER_REQUEST
if (!env.includes('MAX_FILES_PER_REQUEST')) {
  env = env.trimEnd() + '\nMAX_FILES_PER_REQUEST=10\n';
  console.log('✅ MAX_FILES_PER_REQUEST=10 اضافه شد');
}

fs.writeFileSync(envPath, env, 'utf8');
console.log('\n--- خطوط مربوطه ---');
env.split('\n').forEach((l) => {
  if (l.includes('MAX_FILE') || l.includes('UPLOAD')) console.log(l);
});