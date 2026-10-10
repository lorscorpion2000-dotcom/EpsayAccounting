import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  { file: 'src/modules/audit/audit.service.ts', imports: ['startOfLocalDay'] },
  { file: 'src/modules/notifications/notification.service.ts', imports: ['startOfLocalDay'] },
  { file: 'src/modules/payroll/employee-card.service.ts', imports: ['endOfLocalDay'] },
];

for (const t of FILES) {
  const FILE = path.join(__dirname, t.file);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-imp-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  // چک کن آیا import خط کامل داره
  const importLine = `import { ${t.imports.join(', ')} } from '../../common/utils/date.util';`;

  if (srcN.includes(importLine)) {
    console.log('ℹ️  از قبل:', t.file);
    continue;
  }

  // اضافه بعد از آخرین import
  const lines = srcN.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, importLine);
  srcN = lines.join('\n');
  console.log('✅ import اضافه شد:', t.file);

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
}

console.log('\n✅ تمام');