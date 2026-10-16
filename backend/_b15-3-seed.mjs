// _b15-3-seed.mjs ΓÇö B15.3: upsert legal contract templates into DB
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DIR = 'E:\\EpsayAccounting\\backend\\templates\\legal-contracts';

const TEMPLATES = [
  {
    kind: 'CONTRACTOR_AGREEMENT',
    title: '┘é╪▒╪º╪▒╪»╪º╪» ┘╛█î┘à╪º┘å┌⌐╪º╪▒█î',
    file: 'CONTRACTOR_AGREEMENT.html',
  },
  {
    kind: 'WORKER_EMPLOYMENT',
    title: '┘é╪▒╪º╪▒╪»╪º╪» ┌⌐╪º╪▒ (┘ç┘à┌⌐╪º╪▒█î)',
    file: 'WORKER_EMPLOYMENT.html',
  },
];

async function main() {
  for (const t of TEMPLATES) {
    const abs = path.join(DIR, t.file);
    if (!fs.existsSync(abs)) {
      console.log('  [X] missing file: ' + t.file);
      continue;
    }
    const bodyHtml = fs.readFileSync(abs, 'utf8');
    const existing = await prisma.legalContractTemplate.findUnique({
      where: { kind: t.kind },
    });
    if (existing) {
      await prisma.legalContractTemplate.update({
        where: { kind: t.kind },
        data: { title: t.title, bodyHtml, isActive: true },
      });
      console.log('  [i] ' + t.kind + ' ΓÇö updated (' + bodyHtml.length + ' chars)');
    } else {
      await prisma.legalContractTemplate.create({
        data: {
          kind: t.kind,
          title: t.title,
          bodyHtml,
          isActive: true,
        },
      });
      console.log('  [OK] ' + t.kind + ' ΓÇö created (' + bodyHtml.length + ' chars)');
    }
  }

  const total = await prisma.legalContractTemplate.count();
  console.log('');
  console.log('DB total legal contract templates: ' + total);
  await prisma.$disconnect();
  console.log('Done.');
}
main().catch((e) => { console.error(e); process.exit(1); });
