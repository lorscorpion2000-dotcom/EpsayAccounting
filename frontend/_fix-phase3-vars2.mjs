import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// فایل ۱: PayrollPeriodsPage — anchor مستقیم
{
  const FILE = path.join(__dirname, 'src', 'modules', 'payroll', 'pages', 'PayrollPeriodsPage.tsx');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-v2-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  const lines = srcN.split('\n');

  // چاپ محدوده AdminDeleteButton
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<AdminDeleteButton')) {
      console.log('\n═══ PayrollPeriodsPage @ خط ' + (i + 1) + ' ═══');
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 12); j++) {
        console.log(`${(j + 1).toString().padStart(4)}: ${lines[j]}`);
      }
      break;
    }
  }

  // پیدا کردن map variable با الگوهای بیشتر
  let realVar = null;
  for (let i = 0; i < lines.length; i++) {
    // الگوهای مختلف: {items.map((p) => | {filtered.map(p => | displayedItems.map((period) =>
    const patterns = [
      /\.map\(\(\s*(\w+)/,
      /\.map\(\s*(\w+)\s*=>/,
      /\{\s*\w+\.map\(\s*(\w+)/,
    ];
    for (const re of patterns) {
      const m = lines[i].match(re);
      if (m) {
        // اگه anchor AdminDeleteButton بعد از این خط هست
        if (lines.slice(i).some(l => l.includes('<AdminDeleteButton'))) {
          realVar = m[1];
        }
      }
    }
  }

  if (!realVar) {
    console.log('   ❌ map var پیدا نشد — باید دستی fix بشه');
    process.exit(1);
  }

  console.log(`   Real var: ${realVar}`);

  srcN = srcN.replace(/\bid=\{p\.id\}/g, `id={${realVar}.id}`);
  srcN = srcN.replace(/\bitemLabel=\{\(p\s+as\s+any\)\.([^}]+)\}/g, `itemLabel={(${realVar} as any).$1}`);
  srcN = srcN.replace(/\bitemLabel=\{p\.([^}]+)\}/g, `itemLabel={${realVar}.$1}`);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('   ✅ fix شد');
}

// فایل ۲: FiscalYearsPage — cast title به any
{
  const FILE = path.join(__dirname, 'src', 'modules', 'settings', 'pages', 'FiscalYearsPage.tsx');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-v2-' + ts);
  console.log('\n✅ بکاپ FiscalYearsPage');

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  const lines = srcN.split('\n');

  // چاپ محدوده
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<AdminDeleteButton')) {
      console.log('═══ FiscalYearsPage @ خط ' + (i + 1) + ' ═══');
      for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 10); j++) {
        console.log(`${(j + 1).toString().padStart(4)}: ${lines[j]}`);
      }
      break;
    }
  }

  // جایگزینی کامل block itemLabel
  // fy.code || fy.title || '' → (fy as any).code || (fy as any).title || ''
  srcN = srcN.replace(
    /itemLabel=\{\(fy as any\)\.([^}]+)\}/g,
    (match, expr) => {
      // expr: code || (fy as any).title || ''  (چون فقط اولی convert شده بود)
      // همه fy. → (fy as any).
      const newExpr = expr.replace(/\bfy\./g, '(fy as any).');
      return `itemLabel={${newExpr}}`;
    }
  );

  // اگه هنوز f داره
  srcN = srcN.replace(/\bid=\{f\.id\}/g, `id={fy.id}`);
  srcN = srcN.replace(/\bitemLabel=\{\(f\s+as\s+any\)\.([^}]+)\}/g, 'itemLabel={(fy as any).$1}');
  srcN = srcN.replace(/\bitemLabel=\{f\.([^}]+)\}/g, 'itemLabel={(fy as any).$1}');

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  console.log('✅ FiscalYearsPage fix');
}