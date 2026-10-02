/**
 * خروجی HTML به Word — نسخه پایدار (بدون pseudo-elements و field codes)
 */

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="70" height="70">
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="#1e40af" stroke-width="2"/>
  <path d="M50 15 L50 85 M25 50 L75 50" stroke="#1e40af" stroke-width="1.5"/>
  <text x="50" y="58" text-anchor="middle" font-family="Arial" font-size="16" fill="#1e40af" font-weight="bold">EP</text>
</svg>`;

interface WordExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  code?: string;
  bodyHtml: string;
  companyName?: string;
  companySub?: string;
  companyAddress?: string;
  companyPhone?: string;
  signatures?: { left: string; right: string };
}

export function exportHtmlToWord(opts: WordExportOptions): void {
  const companyName = opts.companyName || 'استودیو معماری اپسای';
  const companySub = opts.companySub || 'Epsay Accounting';
  const companyAddress = opts.companyAddress || 'خوانسار دهکده گردشگری گلستان‌کوه';
  const companyPhone = opts.companyPhone || '۰۳۱-۵۷۷۹۹۵۰۰';
  const signatures = opts.signatures || { left: 'مهر و امضای شرکت', right: 'امضای طرف قرارداد' };

  const today = new Date().toLocaleDateString('fa-IR');

  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40' dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>${opts.title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
  size: A4;
  margin: 1.5cm 1.2cm 1.5cm 1.2cm;
  mso-paper-source: 0;
}

body {
  font-family: 'B Nazanin', 'Vazirmatn', 'IRANSans', Tahoma, sans-serif;
  font-size: 12pt;
  line-height: 1.9;
  color: #0f172a;
  direction: rtl;
  text-align: right;
  margin: 0;
  padding: 0;
}

/* ═══════ سربرگ (Header Table) ═══════ */
.header-table {
  width: 100%;
  border-collapse: collapse;
  border-bottom: 3pt double #1e40af;
  margin-bottom: 14pt;
}
.header-table td {
  vertical-align: middle;
  padding: 6pt 8pt;
  border: none;
}
.h-logo {
  width: 80pt;
  text-align: center;
}
.h-center {
  text-align: right;
}
.h-right {
  width: 100pt;
  text-align: left;
  font-size: 9pt;
  color: #64748b;
}
.h-company {
  font-size: 16pt;
  font-weight: bold;
  color: #1e40af;
  line-height: 1.3;
  margin: 0;
}
.h-sub {
  font-size: 10pt;
  color: #475569;
  margin: 3pt 0 0 0;
}
.h-contact {
  font-size: 9pt;
  color: #64748b;
  margin-top: 3pt;
  border-top: 0.5pt solid #e2e8f0;
  padding-top: 3pt;
}
.h-meta-line {
  margin: 2pt 0;
  font-size: 9pt;
  color: #475569;
}
.h-meta-label {
  color: #94a3b8;
  font-weight: normal;
}

/* ═══════ عنوان سند ═══════ */
.doc-title-block {
  text-align: center;
  margin: 14pt 0 12pt 0;
  padding: 10pt;
  border-top: 1pt solid #1e40af;
  border-bottom: 1pt solid #1e40af;
  background: #eff6ff;
}
.doc-main-title {
  font-size: 18pt;
  font-weight: bold;
  color: #1e293b;
  margin: 0;
  padding: 0;
}
.doc-subtitle {
  font-size: 12pt;
  color: #475569;
  margin: 4pt 0 0 0;
}
.doc-code-text {
  font-size: 10pt;
  color: #64748b;
  font-family: 'Courier New', monospace;
  direction: ltr;
  margin-top: 4pt;
}

/* ═══════ کادر محتوا ═══════ */
.content-box {
  border: 1.5pt solid #1e40af;
  padding: 15pt 18pt;
  margin: 12pt 0;
  background: white;
}

/* ═══════ عناوین ═══════ */
h1 {
  font-size: 15pt;
  font-weight: bold;
  color: #1e40af;
  margin: 14pt 0 8pt 0;
  padding-bottom: 4pt;
  border-bottom: 1.5pt solid #1e40af;
}
h2 {
  font-size: 13pt;
  font-weight: bold;
  color: #1e293b;
  margin: 12pt 0 6pt 0;
  padding: 5pt 10pt;
  background: #eff6ff;
  border-right: 4pt solid #1e40af;
}
h3 {
  font-size: 12pt;
  font-weight: bold;
  color: #334155;
  margin: 10pt 0 4pt 0;
}

p {
  margin: 6pt 0;
  text-align: justify;
  line-height: 1.9;
}

ul, ol {
  margin: 6pt 20pt 6pt 0;
  padding: 0;
}
li {
  margin: 3pt 0;
  line-height: 1.8;
}

/* ═══════ جداول ═══════ */
table.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0;
  font-size: 11pt;
}
table.data-table th,
table.data-table td {
  border: 1pt solid #64748b;
  padding: 6pt 8pt;
  text-align: right;
  vertical-align: top;
}
table.data-table th {
  background: #1e40af;
  color: white;
  font-weight: bold;
  text-align: center;
}

/* ═══════ جدول متادیتا ═══════ */
table.meta-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0;
  font-size: 11pt;
}
table.meta-table td {
  padding: 5pt 8pt;
  border-bottom: 0.5pt dashed #cbd5e1;
}
table.meta-table td:first-child {
  font-weight: bold;
  color: #475569;
  width: 25%;
  background: #f8fafc;
}

/* ═══════ کادر اطلاعات ═══════ */
.info-box {
  border: 1pt solid #3b82f6;
  background: #eff6ff;
  padding: 10pt 12pt;
  margin: 10pt 0;
}

/* ═══════ امضاها ═══════ */
table.signature-table {
  width: 100%;
  margin-top: 50pt;
  border-collapse: collapse;
}
table.signature-table td {
  width: 50%;
  text-align: center;
  vertical-align: bottom;
  padding: 0 25pt;
  border: none;
}
.sig-label {
  font-size: 11pt;
  color: #475569;
  margin-bottom: 50pt;
}
.sig-line {
  border-top: 1pt solid #1e40af;
  padding-top: 6pt;
  font-weight: bold;
  color: #1e293b;
  font-size: 11pt;
  min-height: 20pt;
}
.sig-date {
  font-size: 9pt;
  color: #94a3b8;
  margin-top: 4pt;
}

/* ═══════ پانویس ═══════ */
.footer-box {
  margin-top: 30pt;
  padding-top: 8pt;
  border-top: 1pt solid #cbd5e1;
  text-align: center;
  font-size: 9pt;
  color: #94a3b8;
}

/* Word-specific */
p, h1, h2, h3, li {
  mso-line-height-rule: exactly;
}
</style>
</head>
<body>

<!-- ═══════ سربرگ ═══════ -->
<table class="header-table" cellpadding="0" cellspacing="0">
  <tr>
    <td class="h-logo">
      ${LOGO_SVG}
    </td>
    <td class="h-center">
      <div class="h-company">${companyName}</div>
      <div class="h-sub">${companySub}</div>
      <div class="h-contact">${companyAddress} | تلفن: ${companyPhone}</div>
    </td>
    <td class="h-right">
      <div class="h-meta-line"><span class="h-meta-label">تاریخ:</span> ${today}</div>
      <div class="h-meta-line"><span class="h-meta-label">شماره:</span> ${opts.code || '—'}</div>
    </td>
  </tr>
</table>

<!-- ═══════ عنوان سند ═══════ -->
<div class="doc-title-block">
  <div class="doc-main-title">${opts.title}</div>
  ${opts.subtitle ? '<div class="doc-subtitle">' + opts.subtitle + '</div>' : ''}
  ${opts.code ? '<div class="doc-code-text">' + opts.code + '</div>' : ''}
</div>

<!-- ═══════ کادر محتوا ═══════ -->
<div class="content-box">
${opts.bodyHtml}
</div>

<!-- ═══════ امضاها ═══════ -->
<table class="signature-table" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <div class="sig-label">${signatures.right}</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-date">تاریخ: .....................</div>
    </td>
    <td>
      <div class="sig-label">${signatures.left}</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-date">تاریخ: .....................</div>
    </td>
  </tr>
</table>

<!-- ═══════ پانویس ═══════ -->
<div class="footer-box">
  این سند توسط سیستم حسابداری اپسای تولید شده است — ${new Date().toLocaleString('fa-IR')}
</div>

</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename.endsWith('.doc') ? opts.filename : opts.filename + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * چاپ HTML در پنجره جدید
 */
export function printHtmlInNewWindow(title: string, htmlContent: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    body {
      font-family: 'Vazirmatn', 'B Nazanin', Tahoma, sans-serif;
      direction: rtl;
      font-size: 12pt;
      line-height: 1.8;
      padding: 20px;
      color: #0f172a;
    }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 6px; }
    h2 { background: #eff6ff; border-right: 4px solid #1e40af; padding: 6px 10px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table th, table td { border: 1px solid #64748b; padding: 6px 8px; text-align: right; }
    table th { background: #1e40af; color: white; text-align: center; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>`);
  w.document.close();
}

/**
 * چاپ ساده
 */
export function printCurrentContent(): void {
  window.print();
}
