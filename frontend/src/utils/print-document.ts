/**
 * print-document.ts — تولید HTML مستقل برای چاپ در پنجره جدید
 * الگو گرفته از AttendanceGridPage — بدون تداخل با CSS اصلی اپ
 */

export interface PrintOptions {
  title: string;
  orientation?: 'portrait' | 'landscape';
  margin?: string;
  logoUrl?: string;
  companyName?: string;
  companySubtitle?: string;
}

const BASE_CSS = `
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
.doc-wrap { width: 100%; }

.doc-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 3mm; margin-bottom: 4mm;
  border-bottom: 2px solid #7C3AED;
}
.doc-header-brand { display: flex; align-items: center; gap: 3mm; }
.doc-header-logo { width: 14mm; height: 14mm; object-fit: contain; }
.doc-header-name { font-size: 13pt; font-weight: bold; color: #1e293b; }
.doc-header-sub { font-size: 9pt; color: #64748b; margin-top: 1mm; }
.doc-header-meta { text-align: left; font-size: 9pt; color: #64748b; line-height: 1.5; }
.doc-header-meta .val { font-weight: bold; color: #1e293b; font-size: 10pt; }

.doc-title { text-align: center; margin: 4mm 0 6mm; }
.doc-title h1 { margin: 0; font-size: 16pt; font-weight: bold; color: #4c1d95; }
.doc-title .sub { font-size: 10pt; color: #64748b; margin-top: 1mm; }

.meta-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 2mm 8mm; font-size: 10pt; margin-bottom: 5mm;
}
.meta-row { display: flex; gap: 2mm; }
.meta-row .lbl { color: #64748b; min-width: 22mm; }
.meta-row .val { font-weight: 500; flex: 1; }

.print-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5pt; }
.print-table th, .print-table td {
  border: 1px solid #94a3b8;
  padding: 2mm 2mm;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.print-table thead th {
  background: #7C3AED; color: white; font-weight: bold;
  text-align: center;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.print-table tfoot td {
  background: #ede9fe; font-weight: bold;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.print-table .c { text-align: center; }
.print-table .r { text-align: right; }
.print-table .l { text-align: left; }
.print-table .num { font-family: 'Courier New', monospace; direction: ltr; }

.notes-box {
  margin-top: 4mm; padding: 3mm;
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 2mm; font-size: 9.5pt;
}
.notes-box .lbl { color: #64748b; font-size: 9pt; margin-bottom: 1mm; }

.signatures {
  margin-top: 12mm; padding-top: 6mm;
  border-top: 1px solid #cbd5e1;
  display: flex; justify-content: space-around; font-size: 9.5pt;
}
.signatures > div { text-align: center; min-width: 40mm; }
.signatures .title { color: #64748b; margin-bottom: 12mm; }
.signatures .line { border-top: 1px solid #94a3b8; padding-top: 1.5mm; font-weight: bold; }

.status-bar {
  margin-top: 6mm; padding-top: 3mm;
  border-top: 1px solid #e2e8f0;
  display: flex; justify-content: space-between;
  font-size: 8.5pt; color: #94a3b8;
}
`;

export function escapeHtml(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getTodayJalali(): string {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: 'Asia/Tehran',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('fa-IR');
  }
}

export function buildPrintHtml(bodyHtml: string, options: PrintOptions): string {
  const {
    title,
    orientation = 'portrait',
    margin = '10mm 8mm 12mm 8mm',
  } = options;
  const css = BASE_CSS
    .replace('ORIENTATION', orientation)
    .replace('MARGIN', margin);

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>${css}</style>
</head>
<body><div class="doc-wrap">
${bodyHtml}
</div></body></html>`;
}

export function printHtml(bodyHtml: string, options: PrintOptions): void {
  const html = buildPrintHtml(bodyHtml, options);
  const w = window.open('', '_blank');
  if (!w) { alert('پنجره چاپ باز نشد — لطفاً پاپ‌آپ را اجازه دهید'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 500);
}

export function standardHeader(opts: {
  title: string;
  subtitle?: string;
  meta?: string;
  logoUrl?: string;
  companyName?: string;
  companySubtitle?: string;
}): string {
  const {
    title, subtitle = '', meta = '',
    logoUrl = window.location.origin + '/images/logo.png',
    companyName = 'حسابداری اپسای',
    companySubtitle = 'استودیو معماری اپسای',
  } = opts;

  return `
<div class="doc-header">
  <div class="doc-header-brand">
    <img class="doc-header-logo" src="${logoUrl}" alt="لوگو" />
    <div>
      <div class="doc-header-name">${escapeHtml(companyName)}</div>
      <div class="doc-header-sub">${escapeHtml(companySubtitle)}</div>
    </div>
  </div>
  ${meta ? `<div class="doc-header-meta">${meta}</div>` : ''}
</div>
<div class="doc-title">
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ''}
</div>`;
}

export function standardSignatures(labels: string[]): string {
  return `
<div class="signatures">
  ${labels.map((l) => `
    <div>
      <div class="title">${escapeHtml(l)}</div>
      <div class="line">امضاء</div>
    </div>`).join('')}
</div>`;
}
