import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const Z = '\u200C';

// ═══════════════════════════════════════════════════════════════
// 1) word-export.ts utility
// ═══════════════════════════════════════════════════════════════
const wordExport = `/**
 * خروجی HTML به فایل Word (سازگار با Microsoft Word)
 */
export function exportHtmlToWord(
  filename: string,
  title: string,
  htmlContent: string,
): void {
  const styles = \`
    <style>
      @page { size: A4; margin: 2cm 1.5cm; }
      body {
        font-family: 'Vazirmatn', 'B Nazanin', 'Tahoma', sans-serif;
        direction: rtl;
        text-align: right;
        font-size: 12pt;
        line-height: 1.8;
        color: #1e293b;
      }
      h1, h2, h3 { color: #1e293b; }
      h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 8pt; }
      h2 { font-size: 14pt; font-weight: bold; margin: 12pt 0 6pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; }
      h3 { font-size: 12pt; font-weight: bold; margin: 8pt 0 4pt; }
      p { margin: 4pt 0; }
      table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
      table th, table td {
        border: 1px solid #94a3b8;
        padding: 6pt 8pt;
        text-align: right;
        vertical-align: top;
        font-size: 11pt;
      }
      table th { background: #e2e8f0; font-weight: bold; }
      .header-info {
        text-align: center;
        margin-bottom: 12pt;
        padding-bottom: 8pt;
        border-bottom: 2px solid #1e293b;
      }
      .meta { font-size: 10pt; color: #475569; margin: 2pt 0; }
      .footer-signatures {
        margin-top: 40pt;
        display: flex;
        justify-content: space-between;
      }
      .signature-box { text-align: center; width: 45%; }
      .signature-line {
        margin-top: 40pt;
        border-top: 1px solid #1e293b;
        padding-top: 4pt;
      }
      .box { border: 1px solid #cbd5e1; padding: 8pt; margin: 6pt 0; background: #f8fafc; }
      .badge { display: inline-block; padding: 2pt 6pt; border-radius: 3pt; background: #e2e8f0; font-size: 10pt; }
    </style>
  \`;

  const html = \`<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>\${title}</title>
  \${styles}
</head>
<body>
\${htmlContent}
</body>
</html>\`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : filename + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * باز کردن یک HTML در تب جدید برای چاپ (fallback)
 */
export function printHtmlInNewWindow(title: string, htmlContent: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(\`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>\${title}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    body {
      font-family: 'Vazirmatn', 'Tahoma', sans-serif;
      direction: rtl;
      font-size: 12pt;
      line-height: 1.8;
      padding: 20px;
      color: #1e293b;
    }
    table { width: 100%; border-collapse: collapse; }
    table th, table td { border: 1px solid #94a3b8; padding: 6pt 8pt; text-align: right; }
    table th { background: #e2e8f0; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  \${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  <\/script>
</body>
</html>\`);
  w.document.close();
}
`;

fs.writeFileSync(ROOT + '/frontend/src/utils/word-export.ts', wordExport, 'utf8');
console.log('OK word-export.ts');

// ═══════════════════════════════════════════════════════════════
// 2) ContractViewPage — افزودن Word + fix Print
// ═══════════════════════════════════════════════════════════════
const viewPath = ROOT + '/frontend/src/modules/contracts/pages/ContractViewPage.tsx';
if (fs.existsSync(viewPath)) {
  let c = fs.readFileSync(viewPath, 'utf8');
  let changed = false;

  // import utility + آیکون
  if (!c.includes('exportHtmlToWord')) {
    c = c.replace(
      "import PrintHeader from '@/components/PrintHeader';",
      "import PrintHeader from '@/components/PrintHeader';\nimport { exportHtmlToWord } from '@/utils/word-export';"
    );
    // آیکون FileText برای word
    if (!c.includes('FileText')) {
      c = c.replace(
        "import { ArrowRight, Loader2, Printer, Play, CheckCircle2, Ban } from 'lucide-react';",
        "import { ArrowRight, Loader2, Printer, Play, CheckCircle2, Ban, FileText } from 'lucide-react';"
      );
    }
    changed = true;
  }

  // تابع word export
  if (!c.includes('handleWordExport')) {
    const fn = `
  const handleWordExport = () => {
    if (!data) return;
    const htmlContent = printRef.current ? printRef.current.innerHTML : '';
    exportHtmlToWord(
      'قرارداد-' + (data.code || data.title),
      data.title,
      htmlContent,
    );
  };

  const handlePrint = () => {
    if (!data) return;
    window.print();
  };
`;
    // درج قبل از "return ("
    const idx = c.indexOf('  return (');
    if (idx > 0) {
      c = c.slice(0, idx) + fn + '\n' + c.slice(idx);
      changed = true;
    }
  }

  // دکمه Word + Print در هدر
  if (!c.includes('handleWordExport()')) {
    // پیدا کردن PrintButton فعلی
    const anchor = '<PrintButton contentRef={printRef} documentTitle={data.title} />';
    if (c.includes(anchor)) {
      const newButtons = `${anchor}
          <button onClick={handleWordExport} className="btn-secondary" title="خروجی Word">
            <FileText className="w-4 h-4" />
            Word
          </button>`;
      c = c.replace(anchor, newButtons);
      changed = true;
    } else {
      // اگر PrintButton نبود اضافه کن
      const anchor2 = '<div className="flex items-center gap-2">';
      if (c.includes(anchor2)) {
        const newBtns = `${anchor2}
          <PrintButton contentRef={printRef} documentTitle={data.title} />
          <button onClick={handleWordExport} className="btn-secondary" title="خروجی Word">
            <FileText className="w-4 h-4" />
            Word
          </button>`;
        c = c.replace(anchor2, newBtns);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(viewPath, c, 'utf8');
    console.log('OK ContractViewPage.tsx');
  } else {
    console.log('SKIP ContractViewPage');
  }
} else {
  console.log('!! ContractViewPage پیدا نشد');
}

// ═══════════════════════════════════════════════════════════════
// 3) ContractTemplatesPage — افزودن Print + Word
// ═══════════════════════════════════════════════════════════════
const tplPath = ROOT + '/frontend/src/modules/contracts/pages/ContractTemplatesPage.tsx';
if (fs.existsSync(tplPath)) {
  let c = fs.readFileSync(tplPath, 'utf8');
  let changed = false;

  // imports
  if (!c.includes('exportHtmlToWord')) {
    c = c.replace(
      "import { Loader2, Save, FileText, RefreshCw } from 'lucide-react';",
      "import { Loader2, Save, FileText, RefreshCw, Printer, Download } from 'lucide-react';\nimport { exportHtmlToWord, printHtmlInNewWindow } from '@/utils/word-export';"
    );
    changed = true;
  }

  // توابع
  if (!c.includes('handleWordExport')) {
    const fn = `
  const handleWordExport = () => {
    if (!bodyHtml.trim()) { toast.error('متنی برای خروجی وجود ندارد'); return; }
    exportHtmlToWord(
      'قالب-' + KIND_LABELS[activeKind],
      title || KIND_LABELS[activeKind],
      '<h1>' + (title || KIND_LABELS[activeKind]) + '</h1>' + bodyHtml,
    );
    toast.success('فایل Word دانلود شد');
  };

  const handlePrint = () => {
    if (!bodyHtml.trim()) { toast.error('متنی برای چاپ وجود ندارد'); return; }
    printHtmlInNewWindow(
      title || KIND_LABELS[activeKind],
      '<h1>' + (title || KIND_LABELS[activeKind]) + '</h1>' + bodyHtml,
    );
  };
`;
    const idx = c.indexOf('  return (');
    if (idx > 0) {
      c = c.slice(0, idx) + fn + '\n' + c.slice(idx);
      changed = true;
    }
  }

  // دکمهها در هدر
  if (!c.includes('handleWordExport()')) {
    // anchor: دکمه ذخیره
    const anchor = '<button className="btn-primary" onClick={handleSave} disabled={saving}>';
    if (c.includes(anchor)) {
      const newBtns = `<button className="btn-secondary" onClick={handlePrint} disabled={loading} title="چاپ">
            <Printer className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleWordExport} disabled={loading} title="خروجی Word">
            <Download className="w-4 h-4" /> Word
          </button>
          ${anchor}`;
      c = c.replace(anchor, newBtns);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(tplPath, c, 'utf8');
    console.log('OK ContractTemplatesPage.tsx');
  } else {
    console.log('SKIP ContractTemplatesPage');
  }
} else {
  console.log('!! ContractTemplatesPage پیدا نشد');
}

console.log('');
console.log('=== DONE ===');