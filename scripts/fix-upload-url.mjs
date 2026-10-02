import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) اصلاح upload.controller.ts
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/common/upload/upload.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

const oldRel = `    const rel = file.path.replace(process.cwd(), '').replace(/\\\\/g, '/');
    return {
      url: '/api/uploads' + rel,`;

const newRel = `    const rel = file.path.replace(process.cwd(), '').replace(/\\\\/g, '/').replace(/^\\/uploads/, '');
    return {
      url: '/api/uploads' + rel,`;

if (ctrl.includes("url: '/api/uploads' + rel")) {
  // جایگزینی خط rel
  ctrl = ctrl.replace(
    /const rel = file\.path\.replace\(process\.cwd\(\), ''\)\.replace\(\/\\\\\/g, '\/'\);/,
    "const rel = file.path.replace(process.cwd(), '').replace(/\\\\/g, '/').replace(/^\\/uploads/, '');"
  );
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('OK upload.controller.ts');
} else {
  console.log('!! upload.controller anchor not found');
  // fallback
  const alt = ctrl.replace(
    ".replace(/\\\\/g, '/');",
    ".replace(/\\\\/g, '/').replace(/^\\/uploads/, '');"
  );
  if (alt !== ctrl) {
    fs.writeFileSync(ctrlPath, alt, 'utf8');
    console.log('OK upload.controller.ts (fallback)');
  }
}

console.log('');
console.log('=== DONE ===');