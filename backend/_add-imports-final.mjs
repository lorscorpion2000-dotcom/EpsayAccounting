import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  'src/modules/dashboard/dashboard-executive.service.ts',
  'src/modules/payroll/employee-card.service.ts',
];

for (const rel of FILES) {
  const FILE = path.join(__dirname, rel);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-impfin-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // چک import دقیق
  if (/import\s*\{[^}]*\btoLocalDateString\b[^}]*\}\s*from/.test(srcN)) {
    console.log('ℹ️  import از قبل هست:', rel);
    continue;
  }

  // اضافه بعد از آخرین import
  const lines = srcN.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, `import { toLocalDateString } from '../../common/utils/date.util';`);
  srcN = lines.join('\n');
  console.log('✅ import اضافه شد:', rel);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
}

console.log('\n✅ تمام');