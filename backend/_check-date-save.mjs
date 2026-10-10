import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// دنبال set periodStart/periodEnd در service ها
const FILES = [
  'src/modules/payroll/subcontractor-statements.service.ts',
  'src/modules/payroll/worker-statements.service.ts',
];

for (const rel of FILES) {
  const FILE = path.join(__dirname, rel);
  if (!fs.existsSync(FILE)) continue;
  const src = fs.readFileSync(FILE, 'utf8');
  const lines = src.split(/\r?\n/);
  console.log('\n══════════════════════════════════════');
  console.log('📁', rel);
  console.log('══════════════════════════════════════');
  lines.forEach((l, i) => {
    if (/periodStart|periodEnd/.test(l) && !/entryDate|toISOString/.test(l)) {
      console.log(`${(i + 1).toString().padStart(4)}: ${l.trim().slice(0, 140)}`);
    }
  });
}