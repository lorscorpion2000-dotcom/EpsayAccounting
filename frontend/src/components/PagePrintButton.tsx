// PAGE_PRINT_BUTTON_V1 — چاپ کل <main> با HTML مستقل + modal انتخاب جهت
import { useState } from 'react';
import { Printer, FileText, FileImage, X } from 'lucide-react';

interface Props {
  documentTitle?: string;
  className?: string;
  label?: string;
  orientation?: 'portrait' | 'landscape';
  pageMargin?: string;
  autoOrientation?: boolean;
}

const PAGE_PRINT_CSS = `
@page { size: A4 ORIENTATION; margin: MARGIN; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: 'Vazirmatn', Tahoma, sans-serif;
  direction: rtl; color: #0f172a;
  font-size: 10pt; background: white;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.doc-wrap { width: 100%; padding: 0; }
.print-header { text-align: center; margin-bottom: 6mm; padding-bottom: 3mm; border-bottom: 2px solid #7C3AED; }
.print-header .brand { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
.print-header .sub { font-size: 9pt; color: #64748b; margin-top: 1mm; }
.print-header-title { text-align: center; margin: 4mm 0 5mm; }
.print-header-title h1 { margin: 0; font-size: 15pt; font-weight: bold; color: #4c1d95; }
.grid { display: grid; gap: 3mm; }
.grid-cols-2 { grid-template-columns: 1fr 1fr; }
.grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.mt-6 { margin-top: 6mm; }
.mb-6 { margin-bottom: 6mm; }
.text-sm { font-size: 10pt; }
.text-xs { font-size: 9pt; }
.font-bold { font-weight: bold; }
.text-slate-500 { color: #64748b; }
.text-slate-800 { color: #1e293b; }
.flex { display: flex; }
.gap-2 { gap: 2mm; }
.gap-4 { gap: 4mm; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5pt; margin-bottom: 4mm; }
table th, table td {
  border: 1px solid #94a3b8;
  padding: 2mm 2mm;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
table thead th {
  background: #7C3AED; color: white; font-weight: bold;
  text-align: center;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
table tfoot td {
  background: #ede9fe; font-weight: bold;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
table .text-center, table .text-center * { text-align: center; }
table .text-right { text-align: right; }
table .text-left { text-align: left; }
.num { font-family: 'Courier New', monospace; direction: ltr; unicode-bidi: isolate; }
img { max-width: 100% !important; height: auto !important; }
img[src*="logo"], img[src*="Logo"], img[alt="لوگو"], img[alt*="Logo"], img[alt*="لوگو"] {
  max-width: 55px !important; max-height: 55px !important;
  width: auto !important; height: auto !important; object-fit: contain !important;
}
img[src*="sign"], img[src*="stamp"], img[alt*="امضا"], img[alt*="مهر"] {
  max-width: 90px !important; max-height: 90px !important;
  width: auto !important; height: auto !important;
}
table img { max-width: 60px !important; max-height: 60px !important; width: auto !important; height: auto !important; }
.bg-emerald-50 { background: #ecfdf5; padding: 3mm; border: 1px solid #a7f3d0; border-radius: 2mm; }
.bg-red-50 { background: #fef2f2; padding: 3mm; border: 1px solid #fecaca; border-radius: 2mm; }
.bg-slate-50 { background: #f8fafc; padding: 3mm; border: 1px solid #e2e8f0; border-radius: 2mm; }
.rounded-lg { border-radius: 2mm; }
.leading-7 { line-height: 1.7; }
.whitespace-pre-wrap { white-space: pre-wrap; }
`;

function absolutizeUrls(root: HTMLElement) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('/')) img.setAttribute('src', window.location.origin + src);
  });
}

function findMainElement(): HTMLElement {
  const selectors = ['main', '[role="main"]', '.app-main', '#app-main', '.main-content'];
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) return el;
  }
  return document.body;
}

function cleanupMainClone(): HTMLElement {
  const root = findMainElement();
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print, [data-no-print]').forEach((el) => el.remove());
  clone.querySelectorAll('button, input, select, textarea').forEach((el) => el.remove());
  absolutizeUrls(clone);
  return clone;
}

function detectOrientation(el: HTMLElement): 'portrait' | 'landscape' {
  const tables = el.querySelectorAll('table');
  let maxCols = 0;
  tables.forEach((t) => {
    const firstRow = t.querySelector('thead tr');
    if (firstRow) {
      const cols = firstRow.querySelectorAll('th, td').length;
      if (cols > maxCols) maxCols = cols;
    }
  });
  if (maxCols >= 7) return 'landscape';
  if (el.scrollWidth > 720) return 'landscape';
  return 'portrait';
}

function wrapInDocument(innerHtml: string, title: string, orientation: string, margin: string): string {
  const css = PAGE_PRINT_CSS
    .replace('ORIENTATION', orientation)
    .replace('MARGIN', margin);
  const safeTitle = String(title || 'چاپ').replace(/[<>&"]/g, '');
  return '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>' + safeTitle + '</title>'
    + '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">'
    + '<style>' + css + '</style></head><body><div class="doc-wrap">' + innerHtml + '</div></body></html>';
}

export default function PagePrintButton({
  documentTitle = 'گزارش',
  className = 'btn-secondary',
  label = 'چاپ',
  orientation = 'portrait',
  pageMargin = '10mm 8mm 12mm 8mm',
  autoOrientation = false,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [suggested, setSuggested] = useState<'portrait' | 'landscape'>(orientation);

  const doPrint = (chosen: 'portrait' | 'landscape') => {
    const cleaned = cleanupMainClone();
    const html = wrapInDocument(cleaned.outerHTML, documentTitle, chosen, pageMargin);
    const w = window.open('', '_blank');
    if (!w) { alert('پنجره چاپ باز نشد — پاپ‌آپ را اجازه دهید'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      setTimeout(() => { try { w.focus(); w.print(); } catch { /* silent */ } }, 500);
    };
  };

  const handleClick = () => {
    const main = findMainElement();
    const auto = detectOrientation(main);
    setSuggested(auto);
    if (autoOrientation) {
      doPrint(auto);
    } else {
      setShowPicker(true);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        <Printer className="w-4 h-4" />
        {label}
      </button>

      {showPicker && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">انتخاب جهت چاپ</h3>
                <p className="text-xs text-slate-500 mt-1">
                  برای گزارش‌های ستون‌دار (تراز، حضور و غیاب) افقی توصیه می‌شود
                </p>
              </div>
              <button onClick={() => setShowPicker(false)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => { setShowPicker(false); doPrint('portrait'); }}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors relative"
              >
                {suggested === 'portrait' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">پیشنهاد</span>
                )}
                <FileText className="w-10 h-10 text-slate-400 group-hover:text-brand-600" />
                <div className="text-center">
                  <div className="font-bold text-slate-800">عمودی</div>
                  <div className="text-[10px] text-slate-500 mt-0.5" dir="ltr">Portrait</div>
                </div>
              </button>

              <button
                onClick={() => { setShowPicker(false); doPrint('landscape'); }}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors relative"
              >
                {suggested === 'landscape' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">پیشنهاد</span>
                )}
                <FileImage className="w-10 h-10 text-slate-400 group-hover:text-brand-600" />
                <div className="text-center">
                  <div className="font-bold text-slate-800">افقی</div>
                  <div className="text-[10px] text-slate-500 mt-0.5" dir="ltr">Landscape</div>
                </div>
              </button>
            </div>

            <div className="px-6 pb-5 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">جهت پیشنهادی بر اساس عرض جدول محاسبه شده است</span>
              <button onClick={() => setShowPicker(false)} className="btn-secondary text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
