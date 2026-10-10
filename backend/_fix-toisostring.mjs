import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let ok = 0;

// ═══ ۱. dashboard-executive.service.ts ═══
{
  const FILE = path.join(__dirname, 'src', 'modules', 'dashboard', 'dashboard-executive.service.ts');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-iso-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  let ch = 0;

  // from/to → toLocalDateString
  const oldBlock = `    return {
      days,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),`;
  const newBlock = `    return {
      days,
      from: toLocalDateString(from),
      to: toLocalDateString(to),`;

  if (srcN.includes(oldBlock)) {
    srcN = srcN.replace(oldBlock, newBlock);
    ch++;
    console.log('✅ dashboard-executive.service.ts: from/to → toLocalDateString');
  } else {
    // شاید فقط to هست
    const oldOnlyTo = `      to: to.toISOString().slice(0, 10),`;
    const newOnlyTo = `      to: toLocalDateString(to),`;
    if (srcN.includes(oldOnlyTo)) {
      srcN = srcN.replace(oldOnlyTo, newOnlyTo);
      ch++;
      console.log('✅ dashboard-executive.service.ts: to → toLocalDateString');
    }
  }

  // import
  if (ch > 0 && !srcN.includes('toLocalDateString')) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import { toLocalDateString } from '../../common/utils/date.util';`);
    srcN = lines.join('\n');
    console.log('   ✅ import اضافه شد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  if (ch) ok++;
}

// ═══ ۲. payroll/employee-card.service.ts ═══
{
  const FILE = path.join(__dirname, 'src', 'modules', 'payroll', 'employee-card.service.ts');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-iso-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');
  let ch = 0;

  // date: date.toISOString().slice(0,10) → toLocalDateString(date)
  srcN = srcN.replace(
    /date:\s*date\.toISOString\(\)\.slice\(0,\s*10\)/g,
    'date: toLocalDateString(date)'
  );
  if (!srcN.includes('date: date.toISOString')) ch++;

  // startDate / endDate
  srcN = srcN.replace(
    /startDate:\s*startDate\.toISOString\(\)\.slice\(0,\s*10\)/g,
    'startDate: toLocalDateString(startDate)'
  );
  srcN = srcN.replace(
    /endDate:\s*endDate\.toISOString\(\)\.slice\(0,\s*10\)/g,
    'endDate: toLocalDateString(endDate)'
  );

  if (ch > 0) {
    console.log('✅ payroll/employee-card.service.ts: date/start/end → toLocalDateString');
  }

  // import
  if (!srcN.includes('toLocalDateString')) {
    const lines = srcN.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
    lines.splice(lastImport + 1, 0, `import { toLocalDateString } from '../../common/utils/date.util';`);
    srcN = lines.join('\n');
    console.log('   ✅ import اضافه شد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  if (ch) ok++;
}

// ═══ ۳. petty-cash/accounts.service.ts: نگه‌دار (local درست بود) ═══

console.log(`\n✅ ${ok} فایل fix شد`);