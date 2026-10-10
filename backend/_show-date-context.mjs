import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// فقط موارد مشکوک (نه از DB یا Date.UTC)
const CASES = [
  { file: 'src/modules/accounting/engine/accounting-engine.service.ts', lines: [45, 133, 251] },
  { file: 'src/modules/dashboard/dashboard-executive.service.ts', lines: [248, 249] },
  { file: 'src/modules/payroll/employee-card.service.ts', lines: [114, 146, 147] },
];

for (const c of CASES) {
  const FILE = path.join(__dirname, c.file);
  if (!fs.existsSync(FILE)) continue;
  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  console.log('\n══════════════════════════════════════');
  console.log('📁', c.file);
  console.log('══════════════════════════════════════');

  for (const ln of c.lines) {
    console.log(`\n─── خط ${ln} ───`);
    const start = Math.max(0, ln - 8);
    const end = Math.min(lines.length, ln + 3);
    for (let i = start; i < end; i++) {
      const marker = (i + 1 === ln) ? '▶' : ' ';
      console.log(`${marker} ${(i + 1).toString().padStart(4)}: ${lines[i].slice(0, 140)}`);
    }
  }
}