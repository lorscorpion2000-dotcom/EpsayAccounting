import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Remove ` 216:` artifact from ContractsListPage
// ═══════════════════════════════════════════════════════════════
const clp = path.join(ROOT, 'frontend/src/modules/contracts/pages/ContractsListPage.tsx');
if (fs.existsSync(clp)) {
  let src = fs.readFileSync(clp, 'utf8');
  const before = (src.match(/ 216:/g) || []).length;
  // Fix `>  216:   <` or `> 216:   <` patterns
  src = src.replace(/>\s*216:\s+</g, '>\n                              <');
  src = src.replace(/>\s*216:\s*/g, '>\n                              ');
  const after = (src.match(/ 216:/g) || []).length;
  if (before > 0) {
    fs.writeFileSync(clp, src, 'utf8');
    console.log('[1] ContractsListPage: removed ' + before + ' artifact(s), ' + after + ' remain');
  } else {
    console.log('[1] ContractsListPage: no artifacts found');
  }
}

// ═══════════════════════════════════════════════════════════════
// 2) Delete all *.bak* files in frontend/src and backend/src
// ═══════════════════════════════════════════════════════════════
function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(e.name)) continue;
      walk(p, callback);
    } else {
      callback(p);
    }
  }
}

let bakCount = 0;
let bakBytes = 0;
const dirs = [
  path.join(ROOT, 'frontend/src'),
  path.join(ROOT, 'backend/src'),
  path.join(ROOT, 'backend/prisma'),
];

for (const dir of dirs) {
  walk(dir, (file) => {
    const name = path.basename(file);
    // Match: file.bak, file.bak-XXXX, file.bak-v3, file.bak-fix-XXXX, etc.
    if (/\.bak(-|$)/.test(name)) {
      try {
        const size = fs.statSync(file).size;
        fs.unlinkSync(file);
        bakCount++;
        bakBytes += size;
      } catch (e) {
        console.log('  [X] ' + file + ': ' + e.message);
      }
    }
  });
}

console.log('[2] Removed ' + bakCount + ' .bak file(s), freed ' + (bakBytes / 1024).toFixed(1) + ' KB');

// ═══════════════════════════════════════════════════════════════
// 3) Remove _restore-check (temp folder)
// ═══════════════════════════════════════════════════════════════
const tempDirs = [
  path.join(ROOT, '_restore-check'),
  path.join(ROOT, '_snapshot-from-zip'),
  path.join(ROOT, '_BACKUP-pre-restore-*'),
];

for (const pattern of tempDirs) {
  if (pattern.includes('*')) {
    const baseDir = ROOT;
    const prefix = path.basename(pattern).replace('*', '');
    if (fs.existsSync(baseDir)) {
      for (const e of fs.readdirSync(baseDir, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.startsWith(prefix)) {
          const full = path.join(baseDir, e.name);
          try {
            fs.rmSync(full, { recursive: true, force: true });
            console.log('[3] Removed: ' + e.name);
          } catch (err) {
            console.log('  [X] ' + e.name + ': ' + err.message);
          }
        }
      }
    }
  } else if (fs.existsSync(pattern)) {
    try {
      fs.rmSync(pattern, { recursive: true, force: true });
      console.log('[3] Removed: ' + path.basename(pattern));
    } catch (e) {
      console.log('  [X] ' + path.basename(pattern) + ': ' + e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 4) Clean temp scripts in backend/prisma
// ═══════════════════════════════════════════════════════════════
const prismaDir = path.join(ROOT, 'backend/prisma');
const tempPatterns = [
  /^_/,
  /^templates-before-restore-/,
  /^restore-templates(-v2)?\.mjs$/,
  /^check-templates\.mjs$/,
  /^check-contracts?\.mjs$/,
  /^check-party-fields\.mjs$/,
  /^check-contract-body\.mjs$/,
  /^check-contract-party\.mjs$/,
  /^list-dots\.mjs$/,
  /^apply-placeholders\.mjs$/,
  /^inspect-template\.mjs$/,
  /^sync-party-now(-v2)?\.mjs$/,
  /^test-national-id\.mjs$/,
  /^direct-employee-update\.mjs$/,
  /^fix-empty-contracts\.mjs$/,
  /^update-templates\.mjs$/,
  /^add-party-fields\.mjs$/,
  /^update-sync-method\.mjs$/,
  /^update-schema-partner\.mjs$/,
  /^patch-employee-dto-service\.mjs$/,
  /^fix-partnerupd-type\.mjs$/,
];

if (fs.existsSync(prismaDir)) {
  let removed = 0;
  for (const name of fs.readdirSync(prismaDir)) {
    if (tempPatterns.some(p => p.test(name))) {
      try {
        fs.unlinkSync(path.join(prismaDir, name));
        removed++;
      } catch (e) { /* ignore */ }
    }
  }
  console.log('[4] Removed ' + removed + ' temp script(s) from backend/prisma');
}

// ═══════════════════════════════════════════════════════════════
// 5) Clean temp scripts in frontend/scripts
// ═══════════════════════════════════════════════════════════════
const feScriptsDir = path.join(ROOT, 'frontend/scripts');
const fePatterns = [
  /^_/,
  /^codemod-excel-lazy\.mjs$/,
  /^fix-excel-style-imports\.mjs$/,
  /^fix-mainlayout\.mjs$/,
  /^fix-contracts-list\.mjs$/,
  /^cleanup-216\.mjs$/,
  /^add-employee-fields\.mjs$/,
  /^add-fields-v2\.mjs$/,
  /^enhance-reports\.mjs$/,
  /^check-help-coverage\.mjs$/,
  /^add-help-entries\.mjs$/,
];

if (fs.existsSync(feScriptsDir)) {
  let removed = 0;
  for (const name of fs.readdirSync(feScriptsDir)) {
    if (fePatterns.some(p => p.test(name))) {
      try {
        fs.unlinkSync(path.join(feScriptsDir, name));
        removed++;
      } catch (e) { /* ignore */ }
    }
  }
  console.log('[5] Removed ' + removed + ' temp script(s) from frontend/scripts');
}

// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('Cleanup done.');