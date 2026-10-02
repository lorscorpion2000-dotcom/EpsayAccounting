import fs from 'node:fs';

const files = [
  'frontend/src/modules/accounting/pages/JournalBookPage.tsx',
  'frontend/src/modules/accounting/pages/JournalFormPage.tsx',
  'frontend/src/modules/accounting/pages/JournalViewPage.tsx',
  'frontend/src/modules/accounting/pages/LedgerPage.tsx',
  'frontend/src/modules/accounting/pages/PartyLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/ProjectLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/TrialBalancePage.tsx',
  'frontend/src/modules/settings/pages/RolesPage.tsx',
  'frontend/src/modules/settings/pages/UsersPage.tsx',
  'frontend/src/components/Logo.tsx',
];

const ROOT = 'E:/EpsayAccounting/';

for (const rel of files) {
  const full = ROOT + rel;
  if (!fs.existsSync(full)) { console.log('X ' + rel); continue; }
  
  const buf = fs.readFileSync(full);
  const name = rel.split('/').pop();
  console.log('\n=== ' + name + ' (' + buf.length + ' bytes) ===');
  console.log('  Hex first 20: ' + buf.slice(0, 20).toString('hex'));
  
  let recovered = null;
  let method = '';
  
  // روش 1: UTF-16LE
  try {
    const asU16 = buf.toString('utf16le');
    if (asU16.replace(/^\uFEFF/, '').startsWith('import')) {
      recovered = asU16.replace(/^\uFEFF/, '');
      method = 'UTF-16LE';
    }
  } catch {}
  
  // روش 2: interpret as CP1252 then decode as UTF-8
  if (!recovered) {
    try {
      const s = buf.toString('latin1');
      const rebuf = Buffer.from(s, 'latin1');
      const asUtf8 = rebuf.toString('utf8');
      if (asUtf8.replace(/^\uFEFF/, '').startsWith('import')) {
        recovered = asUtf8.replace(/^\uFEFF/, '');
        method = 'Latin-1';
      }
    } catch {}
  }
  
  // روش 3: UTF-8 → CP1252 → UTF-8
  if (!recovered) {
    try {
      const s = buf.toString('utf8');
      const bytes = Buffer.from(s, 'latin1');
      const fixed = bytes.toString('utf8');
      if (fixed.replace(/^\uFEFF/, '').startsWith('import')) {
        recovered = fixed.replace(/^\uFEFF/, '');
        method = 'UTF8-Latin1-UTF8';
      }
    } catch {}
  }
  
  // روش 4: UTF-8 → CP1256 (Arabic)
  if (!recovered) {
    try {
      const s = buf.toString('utf8');
      const bytes = Buffer.from(s, 'binary');
      const fixed = bytes.toString('utf8');
      if (fixed.replace(/^\uFEFF/, '').startsWith('import')) {
        recovered = fixed.replace(/^\uFEFF/, '');
        method = 'UTF8-Binary-UTF8';
      }
    } catch {}
  }
  
  if (recovered) {
    fs.writeFileSync(full + '.recovered', recovered, 'utf8');
    console.log('  ✓ RECOVERED via ' + method);
    console.log('  First 80: ' + recovered.slice(0, 80));
  } else {
    console.log('  ✗ ناموفق');
    console.log('  As UTF8 first 60: ' + buf.toString('utf8').slice(0, 60));
    console.log('  As UTF16LE first 60: ' + buf.toString('utf16le').slice(0, 60));
  }
}