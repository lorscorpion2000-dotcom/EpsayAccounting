import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'prisma', 'schema.prisma');
const src = fs.readFileSync(FILE, 'utf8');

const CHECKS = [
  { model: 'SubcontractorStatement', fields: ['periodStart', 'periodEnd'] },
  { model: 'WorkerStatement', fields: ['periodStart', 'periodEnd'] },
  { model: 'DailyReport', fields: ['reportDate'] },
];

for (const c of CHECKS) {
  const re = new RegExp(`model ${c.model} \\{[\\s\\S]*?\\n\\}`, 'm');
  const m = src.match(re);
  if (!m) { console.log('❌', c.model); continue; }
  console.log(`\n═══ ${c.model} ═══`);
  for (const f of c.fields) {
    const fieldRe = new RegExp(`^\\s*${f}\\s+DateTime\\??\\s*(.*)$`, 'm');
    const fm = m[0].match(fieldRe);
    if (fm) {
      const type = fm[1] || '(DateTime — نه @db.Date)';
      console.log(`  ${f.padEnd(15)}: ${type}`);
    } else {
      console.log(`  ${f}: ❌ پیدا نشد`);
    }
  }
}