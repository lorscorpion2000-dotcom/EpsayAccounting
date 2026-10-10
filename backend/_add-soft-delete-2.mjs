import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'prisma', 'schema.prisma');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(FILE, FILE + '.bak-softdel2-' + ts);
console.log('✅ بکاپ schema');

let src = fs.readFileSync(FILE, 'utf8');
const wasCRLF = src.includes('\r\n');
let srcN = src.replace(/\r\n/g, '\n');
let ch = 0;

const MODELS = [
  'PayrollPeriod', 'PayrollRecord',
  'WorkerStatement', 'WorkerStatementItem',
  'AdvanceRequest', 'LeaveRequest',
  'DailyWorkLog', 'DailyReport',
  'SalesUnit', 'User', 'Role', 'Unit', 'FiscalYear',
  'AdjustmentIndex', 'PettyCashAccount',
];

for (const modelName of MODELS) {
  const re = new RegExp(`(model ${modelName} \\{[\\s\\S]*?)\\n\\}`, 'm');
  const match = srcN.match(re);
  if (!match) {
    console.log(`⚠️  ${modelName} پیدا نشد`);
    continue;
  }

  const block = match[1];
  if (block.includes('deletedAt')) {
    console.log(`ℹ️  ${modelName} از قبل deletedAt دارد`);
    continue;
  }

  const newBlock = block + `\n\n  deletedAt DateTime? @map("deleted_at")\n  deletedBy String?   @map("deleted_by")`;
  srcN = srcN.replace(match[0], newBlock + '\n}');
  ch++;
  console.log(`✅ ${modelName}`);
}

fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
console.log('');
console.log('✅ مجموع:', ch);