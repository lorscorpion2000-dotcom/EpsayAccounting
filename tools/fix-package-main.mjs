import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\backend\\package.json';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('\n--- قبل ---');
console.log('main:', pkg.main);
console.log('start:prod:', pkg.scripts?.['start:prod']);
console.log('start:', pkg.scripts?.start);

// فیکس main
if (pkg.main !== 'dist/src/main.js') {
  pkg.main = 'dist/src/main.js';
  console.log('\n✅ main → dist/src/main.js');
}

// فیکس start:prod
if (pkg.scripts && pkg.scripts['start:prod'] !== 'node dist/src/main.js') {
  pkg.scripts['start:prod'] = 'node dist/src/main.js';
  console.log('✅ start:prod → node dist/src/main.js');
}

// اگه start هم به main اشتباه اشاره می‌کرد
if (pkg.scripts?.start === 'nest start' || pkg.scripts?.start === 'node dist/main.js') {
  // nest start برای dev استفاده می‌شه، دست نزن
}

fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log('\n--- بعد ---');
const updated = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('main:', updated.main);
console.log('start:prod:', updated.scripts?.['start:prod']);