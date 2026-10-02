import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

console.log('═══ POListPage ═══');
const listPath = ROOT + '/frontend/src/modules/procurement/pages/POListPage.tsx';
if (fs.existsSync(listPath)) {
  const c = fs.readFileSync(listPath, 'utf8');
  console.log((c.includes('از PR') || c.includes('از درخواست') ? '✅' : '❌') + ' badge «از PR»');
  console.log((c.includes('در انتظار تأمین') ? '✅' : '❌') + ' badge «در انتظار تأمین‌کننده»');
}

console.log('\n═══ POFormPage ═══');
const formPath = ROOT + '/frontend/src/modules/procurement/pages/POFormPage.tsx';
if (fs.existsSync(formPath)) {
  const c = fs.readFileSync(formPath, 'utf8');
  console.log((c.includes('supplierId') ? '✅' : '❌') + ' فیلد supplierId');
  console.log((c.includes("required: 'تأمین") ? '⚠' : '✅') + ' تأمین‌کننده اختیاری');
  console.log((c.includes('fromPR') || c.includes('prId') ? '✅' : '❌') + ' اشاره به prId');
}

console.log('\n═══ PRDetailPage — آیا دکمه تأیید/ارسال دارد؟ ═══');
const prPath = ROOT + '/frontend/src/modules/procurement/pages/PRDetailPage.tsx';
if (fs.existsSync(prPath)) {
  const c = fs.readFileSync(prPath, 'utf8');
  console.log((c.includes('submit') ? '✅' : '❌') + ' دکمه submit');
  console.log((c.includes('approve') ? '✅' : '❌') + ' دکمه approve');
}

console.log('\n═══ PRListPage ═══');
const prListPath = ROOT + '/frontend/src/modules/procurement/pages/PRListPage.tsx';
if (fs.existsSync(prListPath)) {
  const c = fs.readFileSync(prListPath, 'utf8');
  console.log('حجم: ' + c.length);
}