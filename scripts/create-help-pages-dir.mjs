import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'E:/EpsayAccounting';

// ساخت پوشه
const dir = ROOT + '/frontend/src/modules/help/pages';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('✅ پوشه help/pages ساخته شد');
} else {
  console.log('ℹ پوشه از قبل هست');
}

// حالا اسکریپت اصلی را دوباره اجرا کن
import('child_process').then(({ execSync }) => {
  execSync('node "' + ROOT + '/scripts/add-workflows-guide.mjs"', {
    stdio: 'inherit',
    cwd: ROOT,
  });
});