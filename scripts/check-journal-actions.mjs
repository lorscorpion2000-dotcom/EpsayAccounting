import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// 1) backend journals.service
const svcPath = ROOT + '/backend/src/modules/accounting/journals.service.ts';
if (fs.existsSync(svcPath)) {
  const c = fs.readFileSync(svcPath, 'utf8');
  console.log('═══ journals.service.ts ═══\n');
  c.split('\n').forEach((l, i) => {
    if (/async (remove|delete|reverse|post|update)/.test(l)) {
      console.log('L' + (i + 1) + ': ' + l.trim());
    }
  });
  
  // چک وضعیت در remove
  const removeMatch = c.match(/async remove[\s\S]{0,800}?\n  \}/);
  if (removeMatch) {
    console.log('\n── remove method ──');
    console.log(removeMatch[0].substring(0, 700));
  }
}

// 2) frontend JournalsListPage
const listPath = ROOT + '/frontend/src/modules/accounting/pages/JournalsListPage.tsx';
if (fs.existsSync(listPath)) {
  const c = fs.readFileSync(listPath, 'utf8');
  console.log('\n═══ JournalsListPage.tsx — دکمه‌های action ═══\n');
  c.split('\n').forEach((l, i) => {
    if (/setDeleting|setPosting|setReversing|action === 'delete'|action === 'post'|action === 'reverse'|handleDelete|handlePost|handleReverse/.test(l)) {
      console.log('L' + (i + 1) + ': ' + l.trim().substring(0, 90));
    }
  });
}