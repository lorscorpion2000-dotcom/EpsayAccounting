// _cleanup-2026-10-08.mjs
// Usage:  node tools\_cleanup-2026-10-08.mjs --dry-run
//         node tools\_cleanup-2026-10-08.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TS = '2026-10-08';
const DRY = process.argv.includes('--dry-run');

const TOOLS = path.join(ROOT, 'tools');
const TOOLS_ARCHIVE = path.join(TOOLS, '_archive', TS);

const SCRIPTS = path.join(ROOT, 'scripts');
const SCRIPTS_ARCHIVE = path.join(SCRIPTS, '_archive', TS);
const SCRIPTS_PS = path.join(SCRIPTS, 'powershell');

// ==== tools/ ====
const TOOLS_KEEP = new Set([
  'get-telegram-config.mjs',
  'encrypt-telegram-config.mjs',
  'encrypt-backup.mjs',
  'decrypt-backup.mjs',
  'generate-backup-key.mjs',
  'generate-config-key.mjs',
  'rotate-config-key.mjs',
  'change-db-password.ps1',
  'monitor-services.ps1',
  'daily-alerts.ps1',
  'restart-epsay.ps1',
  'cleanup-logs.ps1',
  'cleanup-tools.mjs',
  'telegram.config.enc.json',
  '_cleanup-2026-10-08.mjs',
  '_archive',
]);

// فایل‌هایی که مستقیماً حذف میشن (به‌خاطر توکن plaintext)
const TOOLS_HARD_DELETE = new Set([
  'telegram.config.json.bak-2026-10-08T05-17-28',
  'telegram.config.json.bak-2026-10-08T06-35-00',
  'telegram.config.json.bak-2026-10-08T06-36-56',
  'telegram.config.json.UNUSED',
]);

// ==== scripts/powershell/ ====
const PS_KEEP = new Set(['backup-db.ps1', 'diagnose.ps1']);

// زیرپوشه‌های ریشه scripts/ که آرشیو نمیشن
const SCRIPT_DIRS_KEEP = new Set(['_archive', 'powershell']);

// =========================================================

function ensureDir(d) {
  if (!fs.existsSync(d)) {
    if (!DRY) fs.mkdirSync(d, { recursive: true });
    log('MKDIR  ', d);
  }
}

const report = [];
function log(...a) {
  const line = a.join(' ');
  console.log(line);
  report.push(line);
}

function moveOne(src, dst) {
  if (DRY) { log('MOVE   ', src, '->', dst); return; }
  fs.renameSync(src, dst);
  log('MOVED  ', src, '->', dst);
}

function deleteOne(p) {
  if (DRY) { log('DELETE ', p); return; }
  fs.unlinkSync(p);
  log('DELETED', p);
}

// ---------- tools/ ----------
log('=== TOOLS CLEANUP ===');
ensureDir(TOOLS_ARCHIVE);

for (const name of fs.readdirSync(TOOLS)) {
  if (name.startsWith('.')) { log('SKIP   ', name); continue; }
  const full = path.join(TOOLS, name);
  const st = fs.statSync(full);

  if (st.isDirectory()) { log('SKIP-DIR', name); continue; }
  if (TOOLS_KEEP.has(name)) { log('KEEP   ', name); continue; }
  if (TOOLS_HARD_DELETE.has(name)) { deleteOne(full); continue; }
  moveOne(full, path.join(TOOLS_ARCHIVE, name));
}

// ---------- scripts/ (root) ----------
log('');
log('=== SCRIPTS CLEANUP (root) ===');
ensureDir(SCRIPTS_ARCHIVE);

for (const name of fs.readdirSync(SCRIPTS)) {
  if (name.startsWith('.')) { log('SKIP   ', name); continue; }
  const full = path.join(SCRIPTS, name);
  const st = fs.statSync(full);

  if (st.isDirectory()) {
    if (SCRIPT_DIRS_KEEP.has(name)) { log('KEEP-DIR', name); continue; }
    moveOne(full, path.join(SCRIPTS_ARCHIVE, name));
    continue;
  }
  moveOne(full, path.join(SCRIPTS_ARCHIVE, name));
}

// ---------- scripts/powershell/ ----------
log('');
log('=== SCRIPTS/POWERSHELL CLEANUP ===');
if (fs.existsSync(SCRIPTS_PS)) {
  for (const name of fs.readdirSync(SCRIPTS_PS)) {
    if (name.startsWith('.')) { log('SKIP   ', name); continue; }
    const full = path.join(SCRIPTS_PS, name);
    const st = fs.statSync(full);

    if (st.isDirectory()) { log('SKIP-DIR', name); continue; }
    if (PS_KEEP.has(name)) { log('KEEP   ', name); continue; }
    if (/\.bak(-\d{4}|$)/.test(name)) { deleteOne(full); continue; }
    moveOne(full, path.join(SCRIPTS_ARCHIVE, 'powershell-' + name));
  }
}

// ---------- گزارش ----------
log('');
const rptFile = path.join(TOOLS, '_cleanup-report-' + TS + '.txt');
if (!DRY) {
  fs.writeFileSync(rptFile, report.join('\n'), 'utf8');
  console.log('📝 گزارش ذخیره شد:', rptFile);
} else {
  console.log('(dry-run — هیچ تغییری اعمال نشد)');
}