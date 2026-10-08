import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\scripts\\powershell\\backup-db.ps1';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

let txt = fs.readFileSync(file, 'utf8');

// بلاک قدیمی که باید حذف بشه
const oldBlock = `# آمار
$all = Get-ChildItem $BackupDir -Filter "db-*.sql" -ErrorAction SilentlyContinue
$totalMB = [math]::Round(($all | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Log "Total backups: $($all.Count) files, $totalMB MB"
Write-Log "=== Backup finished ==="`;

if (txt.includes(oldBlock)) {
  txt = txt.replace(oldBlock, '');
  fs.writeFileSync(file, txt, 'utf8');
  console.log('✅ بلاک تکراری حذف شد');
} else {
  console.log('⚠️ بلاک قدیمی پیدا نشد — شاید دستی قبلاً حذف شده');
}

console.log('\n=== DONE ✅ ===');