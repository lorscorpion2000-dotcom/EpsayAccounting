import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let ok = 0;

// ═══ ۱. audit.service.ts ═══
{
  const FILE = path.join(__dirname, 'src', 'modules', 'audit', 'audit.service.ts');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-tz-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  const oldBlock = `    const today = new Date();
    today.setHours(0, 0, 0, 0);`;
  const newBlock = `    const today = startOfLocalDay();`;

  if (srcN.includes(oldBlock)) {
    srcN = srcN.replace(oldBlock, newBlock);
    console.log('✅ audit.service.ts: today → startOfLocalDay');

    // import
    if (!srcN.includes('startOfLocalDay')) {
      const lines = srcN.split('\n');
      let lastImport = 0;
      for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
      lines.splice(lastImport + 1, 0, `import { startOfLocalDay } from '../../common/utils/date.util';`);
      srcN = lines.join('\n');
      console.log('   ✅ import اضافه شد');
    }
  } else {
    console.log('⚠️  audit anchor پیدا نشد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  ok++;
}

// ═══ ۲. notification.service.ts ═══
{
  const FILE = path.join(__dirname, 'src', 'modules', 'notifications', 'notification.service.ts');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-tz-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  const oldBlock = `    const now = new Date(); now.setHours(0, 0, 0, 0);`;
  const newBlock = `    const now = startOfLocalDay();`;

  if (srcN.includes(oldBlock)) {
    srcN = srcN.replace(oldBlock, newBlock);
    console.log('✅ notification.service.ts: now → startOfLocalDay');

    if (!srcN.includes('startOfLocalDay')) {
      const lines = srcN.split('\n');
      let lastImport = 0;
      for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
      lines.splice(lastImport + 1, 0, `import { startOfLocalDay } from '../../common/utils/date.util';`);
      srcN = lines.join('\n');
      console.log('   ✅ import اضافه شد');
    }
  } else {
    console.log('⚠️  notification anchor پیدا نشد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  ok++;
}

// ═══ ۳. payroll/employee-card.service.ts ═══
{
  const FILE = path.join(__dirname, 'src', 'modules', 'payroll', 'employee-card.service.ts');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(FILE, FILE + '.bak-tz-' + ts);

  let src = fs.readFileSync(FILE, 'utf8');
  const wasCRLF = src.includes('\r\n');
  let srcN = src.replace(/\r\n/g, '\n');

  const oldBlock = `    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    end.setHours(23, 59, 59, 999);
    return end;`;
  const newBlock = `    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return endOfLocalDay(end);`;

  if (srcN.includes(oldBlock)) {
    srcN = srcN.replace(oldBlock, newBlock);
    console.log('✅ payroll/employee-card.service.ts: endOfLocalDay');

    if (!srcN.includes('endOfLocalDay')) {
      const lines = srcN.split('\n');
      let lastImport = 0;
      for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImport = i;
      lines.splice(lastImport + 1, 0, `import { endOfLocalDay } from '../../common/utils/date.util';`);
      srcN = lines.join('\n');
      console.log('   ✅ import اضافه شد');
    }
  } else {
    console.log('⚠️  employee-card anchor پیدا نشد');
  }

  fs.writeFileSync(FILE, wasCRLF ? srcN.replace(/\n/g, '\r\n') : srcN, 'utf8');
  ok++;
}

// ═══ petty-cash/accounts.service.ts → نگه‌داشتن (محاسبه هفته local درست است) ═══
console.log('\nℹ️  petty-cash/accounts.service.ts: نگه‌داشتن (intentional local week)');

console.log(`\n✅ ${ok} فایل fix شد`);