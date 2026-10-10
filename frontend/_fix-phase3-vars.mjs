import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  'src/modules/payroll/pages/PayrollPeriodsPage.tsx',
  'src/modules/settings/pages/FiscalYearsPage.tsx',
];

for (const rel of FILES) {
  const FILE = path.join(__dirname, rel);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-varfix-' + ts);
  console.log('✅ بکاپ:', rel);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  const lines = srcN.split('\n');

  // پیدا کردن خط AdminDeleteButton
  let btnStart = -1, btnEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<AdminDeleteButton')) {
      btnStart = i;
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].includes('/>')) { btnEnd = j; break; }
      }
      break;
    }
  }

  if (btnStart < 0) { console.log('   ❌ AdminDeleteButton پیدا نشد'); continue; }

  // پیدا کردن map var واقعی از قبل btnStart
  let realVar = null;
  for (let i = btnStart - 1; i >= Math.max(0, btnStart - 200); i--) {
    const m = lines[i].match(/\.map\(\(\s*(\w+)/);
    if (m) { realVar = m[1]; break; }
    const m2 = lines[i].match(/\{\s*\w+\.map\(\(\s*(\w+)/);
    if (m2) { realVar = m2[1]; break; }
  }

  if (!realVar) { console.log('   ❌ map var پیدا نشد'); continue; }

  console.log(`   Real var: ${realVar}`);

  // جایگزینی داخل block
  for (let i = btnStart; i <= btnEnd; i++) {
    lines[i] = lines[i]
      .replace(/\bid=\{(\w+)\.id\}/g, `id={${realVar}.id}`)
      .replace(/\bitemLabel=\{\(?(\w+)\s+as\s+any\)\.([^}]+)\}/g, `itemLabel={(${realVar} as any).$2}`)
      .replace(/\bitemLabel=\{(\w+)\.([^}]+)\}/g, `itemLabel={${realVar}.$2}`);
  }

  fs.writeFileSync(FILE, wasCRLF ? lines.join('\n').replace(/\n/g, '\r\n') : lines.join('\n'), 'utf8');
  console.log('   ✅ fix شد');
}

// RolesPage - cast name به any
{
  const FILE = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'RolesPage.tsx');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-rolefix-' + ts);
  console.log('\n✅ بکاپ RolesPage');

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  srcN = srcN.replace(
    /itemLabel=\{([a-zA-Z_]\w*)\.name\}/g,
    'itemLabel={($1 as any).name}'
  );

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('✅ RolesPage fix');
}