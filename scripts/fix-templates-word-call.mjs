import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const tplPath = ROOT + '/frontend/src/modules/contracts/pages/ContractTemplatesPage.tsx';

if (!fs.existsSync(tplPath)) { console.log('X'); process.exit(1); }
let c = fs.readFileSync(tplPath, 'utf8');

// جایگزینی فراخوانی قدیمی
// حالت 1: کل تابع handleWordExport
const oldFnRegex = /const handleWordExport = \(\) => \{[\s\S]*?\};/;

const newFn = `const handleWordExport = () => {
    if (!bodyHtml.trim()) { toast.error('متنی برای خروجی وجود ندارد'); return; }
    exportHtmlToWord({
      filename: 'قالب-' + KIND_LABELS[activeKind],
      title: title || KIND_LABELS[activeKind],
      subtitle: 'قالب قرارداد',
      bodyHtml: bodyHtml,
    });
    toast.success('فایل Word دانلود شد');
  };`;

if (oldFnRegex.test(c)) {
  c = c.replace(oldFnRegex, newFn);
  fs.writeFileSync(tplPath, c, 'utf8');
  console.log('OK ContractTemplatesPage.tsx');
} else {
  console.log('!! الگو پیدا نشد — نمایش خطوط ۴۵-۶۵');
  const lines = c.split('\n');
  for (let i = 44; i < 65 && i < lines.length; i++) {
    console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
  }
  process.exit(1);
}