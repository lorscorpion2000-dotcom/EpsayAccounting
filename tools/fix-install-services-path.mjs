import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\install-services.ps1';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

let txt = fs.readFileSync(file, 'utf8');

const before = txt;
txt = txt.replace(
  /dist\\main\.js/g,
  'dist\\src\\main.js'
);

if (txt === before) {
  console.log('⚠️ الگو پیدا نشد یا از قبل درسته');
} else {
  fs.writeFileSync(file, txt, 'utf8');
  console.log('✅ مسیر backend به dist\\src\\main.js تغییر کرد');
}

// نمایش
console.log('\n--- خط install backend ---');
const line = txt.split(/\r?\n/).find(l => l.includes('NSSM install Epsay-Backend'));
console.log(line);