// backend/prisma/sync-contract-template.mjs
// Syncs LegalContract.bodyHtml with the current LegalContractTemplate
// of the same kind.
//
// Usage:
//   node prisma/sync-contract-template.mjs           → dry-run (show diff only)
//   node prisma/sync-contract-template.mjs --apply   → actually apply changes
//   node prisma/sync-contract-template.mjs --apply LC-2026-0001  → only this contract

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const codeFilter = args.find((a) => !a.startsWith('--'));

  console.log('');
  console.log('Mode: ' + (apply ? 'APPLY' : 'DRY-RUN (add --apply to change)'));
  if (codeFilter) console.log('Filter: only contracts with code = ' + codeFilter);
  console.log('');

  // Load templates
  const templates = await prisma.legalContractTemplate.findMany();
  const tplByKind = {};
  templates.forEach((t) => { tplByKind[t.kind] = t.bodyHtml || ''; });

  console.log('Available templates:');
  Object.entries(tplByKind).forEach(([kind, body]) => {
    console.log('  ' + kind.padEnd(24) + ' ' + body.length + ' chars');
  });
  console.log('');

  // Load contracts
  const where = codeFilter ? { code: codeFilter } : {};
  const contracts = await prisma.legalContract.findMany({ where, orderBy: { code: 'asc' } });

  if (contracts.length === 0) {
    console.log('No contracts found.');
    return;
  }

  console.log('Contracts scanned: ' + contracts.length);
  console.log('');

  let needSync = 0;
  let applied = 0;
  let skipped = 0;

  for (const c of contracts) {
    const tplBody = tplByKind[c.kind] || '';
    const currentBody = c.bodyHtml || '';
    const same = currentBody === tplBody;

    if (same) {
      skipped++;
      continue;
    }

    needSync++;

    console.log('  ' + c.code + '  | ' + c.kind);
    console.log('    Current bodyHtml:  ' + currentBody.length + ' chars');
    console.log('    Template bodyHtml: ' + tplBody.length + ' chars');
    console.log('    Diff:              ' + (tplBody.length - currentBody.length) + ' chars');

    if (apply) {
      await prisma.legalContract.update({
        where: { id: c.id },
        data: { bodyHtml: tplBody },
      });
      console.log('    [APPLIED]');
      applied++;
    } else {
      console.log('    [NEEDS SYNC — re-run with --apply]');
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log('  Total:    ' + contracts.length);
  console.log('  In-sync:  ' + skipped);
  console.log('  Needed:   ' + needSync);
  if (apply) console.log('  Applied:  ' + applied);
  console.log('');
  if (!apply && needSync > 0) {
    console.log('  To apply changes, re-run:');
    console.log('    node prisma/sync-contract-template.mjs --apply' + (codeFilter ? ' ' + codeFilter : ''));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());