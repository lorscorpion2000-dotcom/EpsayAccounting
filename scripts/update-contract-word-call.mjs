import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const viewPath = ROOT + '/frontend/src/modules/contracts/pages/ContractViewPage.tsx';

if (!fs.existsSync(viewPath)) { console.log('X'); process.exit(1); }
let c = fs.readFileSync(viewPath, 'utf8');
let changed = false;

// بهروزرسانی handleWordExport
const oldFnRegex = /const handleWordExport = \(\) => \{[\s\S]*?\};/;
const newFn = `const handleWordExport = () => {
    if (!data) return;
    const innerHtml = printRef.current
      ? (printRef.current.querySelector('.contract-body')?.innerHTML ||
         printRef.current.innerHTML || '')
      : '';
    exportHtmlToWord({
      filename: 'قرارداد-' + (data.code || data.title),
      title: data.title,
      subtitle: 'قرارداد ' + (KIND_LABELS[data.kind] || ''),
      code: data.code,
      bodyHtml: innerHtml,
      signatures: {
        left: 'مهر و امضای شرکت',
        right: 'امضای طرف قرارداد: ' + (data.party?.fullName || ''),
      },
    });
  };`;

if (oldFnRegex.test(c)) {
  c = c.replace(oldFnRegex, newFn);
  changed = true;
}

if (changed) {
  fs.writeFileSync(viewPath, c, 'utf8');
  console.log('OK ContractViewPage.tsx');
} else {
  console.log('SKIP');
}