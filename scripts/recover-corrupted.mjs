import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';

const corrupted = [
  'frontend/src/modules/accounting/pages/JournalBookPage.tsx',
  'frontend/src/modules/accounting/pages/JournalFormPage.tsx',
  'frontend/src/modules/accounting/pages/JournalViewPage.tsx',
  'frontend/src/modules/accounting/pages/LedgerPage.tsx',
  'frontend/src/modules/accounting/pages/PartyLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/ProjectLedgerPage.tsx',
  'frontend/src/modules/accounting/pages/TrialBalancePage.tsx',
  'frontend/src/modules/settings/pages/FiscalYearsPage.tsx',
  'frontend/src/modules/settings/pages/RolesPage.tsx',
  'frontend/src/modules/settings/pages/UsersPage.tsx',
  'frontend/src/components/Logo.tsx',
];

function isCorrupted(content) {
  if (!content) return true;
  if (/[\u064A\u0643]/.test(content)) return true;
  const trimmed = content.replace(/^\uFEFF/, '').trimStart();
  const valid = ['import ', '/**', '//', 'const ', 'export ', '"use'];
  if (!valid.some((v) => trimmed.startsWith(v))) return true;
  return false;
}

function findHealthyBackup(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  try {
    const files = fs.readdirSync(dir);
    const backups = files
      .filter((f) => f.startsWith(base + '.bak'))
      .map((f) => ({
        name: f,
        full: path.join(dir, f),
        mtime: fs.statSync(path.join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const b of backups) {
      try {
        const content = fs.readFileSync(b.full, 'utf8');
        if (!isCorrupted(content)) return b;
      } catch {}
    }
  } catch {}
  return null;
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  بازگردانی فایل‌های خراب');
console.log('═══════════════════════════════════════════════════════════\n');

const needsRebuild = [];
const restored = [];

for (const rel of corrupted) {
  const full = ROOT + '/' + rel;
  if (!fs.existsSync(full)) {
    console.log('⚠ ' + path.basename(rel) + ' (وجود ندارد)');
    continue;
  }

  const content = fs.readFileSync(full, 'utf8');
  if (!isCorrupted(content)) {
    console.log('✅ ' + path.basename(rel) + ' (سالم)');
    continue;
  }

  const backup = findHealthyBackup(full);
  if (backup) {
    fs.copyFileSync(full, full + '.corrupted');
    fs.copyFileSync(backup.full, full);
    console.log('🔄 ' + path.basename(rel) + ' ← از ' + backup.name);
    restored.push(rel);
  } else {
    console.log('❌ ' + path.basename(rel) + ' (بکاپ سالم ندارد)');
    needsRebuild.push(rel);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  بازگردانی‌شده: ' + restored.length + '  |  نیاز به بازسازی: ' + needsRebuild.length);
console.log('═══════════════════════════════════════════════════════════\n');

if (needsRebuild.length > 0) {
  console.log('فایل‌های نیازمند بازسازی دستی:');
  needsRebuild.forEach((f) => console.log('  ❌ ' + f));
}