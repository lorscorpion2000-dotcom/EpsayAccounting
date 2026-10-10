import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  'src/modules/sales/pages/SalesUnitsPage.tsx',
  'src/modules/sales/pages/SalesCustomersPage.tsx',
  'src/modules/sales/pages/SalesContractsListPage.tsx',
  'src/modules/sales/pages/SalesInvoicesListPage.tsx',
];

for (const rel of CANDIDATES) {
  const FILE = path.join(__dirname, rel);
  if (!fs.existsSync(FILE)) {
    console.log('❌ پیدا نشد:', rel);
    continue;
  }
  const src = fs.readFileSync(FILE, 'utf8');
  const has = src.includes('AdminDeleteButton');
  console.log(`${has ? '✅' : '⚠️ '} ${rel}`);
}