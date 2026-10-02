import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) controller
const ctrl = ROOT + '/backend/src/modules/approvals/approvals.controller.ts';
if (fs.existsSync(ctrl)) {
  console.log('═══ approvals.controller.ts ═══\n');
  console.log(fs.readFileSync(ctrl, 'utf8'));
}

// 2) service methods
const svc = ROOT + '/backend/src/modules/approvals/approvals.service.ts';
if (fs.existsSync(svc)) {
  console.log('\n═══ approvals.service.ts — متدها ═══\n');
  const c = fs.readFileSync(svc, 'utf8');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (/async \w+|async\s+[A-Za-z]/.test(l)) {
      console.log('L' + (i + 1) + ': ' + l.trim());
    }
  });
  console.log('\nحجم فایل: ' + c.length + ' کاراکتر');
}

// 3) frontend approvals API
const api = ROOT + '/frontend/src/modules/approvals/services/approvals.api.ts';
if (fs.existsSync(api)) {
  console.log('\n═══ approvals.api.ts (frontend) ═══\n');
  console.log(fs.readFileSync(api, 'utf8'));
}

// 4) NotificationBell فعلی در MainLayout
const ml = ROOT + '/frontend/src/layouts/MainLayout.tsx';
if (fs.existsSync(ml)) {
  const c = fs.readFileSync(ml, 'utf8');
  const idx = c.indexOf('Bell');
  if (idx > 0) {
    console.log('\n═══ Bell section در MainLayout ═══\n');
    const start = Math.max(0, c.lastIndexOf('\n', idx - 100));
    const end = c.indexOf('</button>', idx) + 10;
    console.log(c.slice(start, end));
  }
}