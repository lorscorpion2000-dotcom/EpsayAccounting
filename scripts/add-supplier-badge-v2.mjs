import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/procurement/pages/POListPage.tsx';
let c = fs.readFileSync(f, 'utf8');

fs.writeFileSync(f + '.bak-supplier-v2', c, 'utf8');
console.log('✅ بکاپ');

// پچ دقیق — فقط این خط را عوض کن
const oldLine = '<td className="px-4 py-3 text-slate-800">{po.supplier?.name}</td>';
const newLine = '<td className="px-4 py-3 text-slate-800">' +
  '{po.supplier?.name || (' +
  '<span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">' +
  'در انتظار تأمین‌کننده' +
  '</span>' +
  ')}' +
  '</td>';

if (c.includes(oldLine)) {
  c = c.replace(oldLine, newLine);
  fs.writeFileSync(f, c, 'utf8');
  console.log('✅ badge «در انتظار تأمین‌کننده» اضافه شد');
} else {
  console.log('❌ خط پیدا نشد');
  console.log('اولین باری که supplier با td آمد:');
  const idx = c.indexOf('po.supplier');
  console.log(c.slice(Math.max(0, idx - 100), idx + 100));
}