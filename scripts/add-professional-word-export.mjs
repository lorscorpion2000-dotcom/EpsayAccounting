import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const wordExport = `/**
 * خروجی HTML به فایل Word با سربرگ لوگو کادر و ظاهر حرفه\u200Cای
 */

const LOGO_SVG = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
  <path d="M50 5 L95 45 L95 95 L5 95 L5 45 Z" fill="none" stroke="#1e40af" stroke-width="3"/>
  <path d="M30 45 L30 85 M50 45 L50 85 M70 45 L70 85" stroke="#1e40af" stroke-width="2"/>
  <text x="50" y="70" text-anchor="middle" font-family="serif" font-size="14" fill="#1e40af" font-weight="bold">EPSAY</text>
</svg>\`;

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
  const companyAddress = opts.companyAddress || 'خوانسار دهکده گردشگری گلستان\u200Cکوه';
  const companyPhone = opts.companyPhone || '۰۳۱-۵۷۷۹۹۵۰۰';
  const signatures = opts.signatures || { left: 'مهر و امضای شرکت', right: 'امضای طرف قرارداد' };

  const html = \`<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40' dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>\${opts.title}</title>
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
  mso-header-margin: 1cm;
  mso-footer-margin: 1cm;
  mso-paper-source: 0;
}

@page :first {
  mso-header: h1;
}

@page {
  mso-header: h1;
  mso-footer: f1;
}

div.Section1 { page: Section1; }

body {
  font-family: 'B Nazanin', 'Vazirmatn', 'IRANSans', Tahoma, sans-serif;
  font-size: 12pt;
  line-height: 1.9;
  color: #0f172a;
  direction: rtl;
  text-align: right;
  margin: 0;
  padding: 0;
  background: white;
}

/* ═══════════ سربرگ (Header) ═══════════ */
.header-table {
  width: 100%;
  border-collapse: collapse;
  border-bottom: 3px double #1e40af;
  margin-bottom: 12pt;
  padding-bottom: 6pt;
}
.header-table td {
  vertical-align: middle;
  padding: 4pt 8pt;
  border: none;
}
.header-logo {
  width: 80px;
  text-align: center;
}
.header-text {
  text-align: right;
}
.header-company {
  font-size: 18pt;
  font-weight: bold;
  color: #1e40af;
  margin: 0;
  line-height: 1.2;
}
.header-sub {
  font-size: 11pt;
  color: #475569;
  margin: 2pt 0 0 0;
}
.header-contact {
  font-size: 9pt;
  color: #64748b;
  margin-top: 2pt;
}

/* ═══════════ سرصفحه صفحه ═══════════ */
.doc-header {
  text-align: center;
  margin: 20pt 0 12pt 0;
  padding: 10pt 0;
  border-top: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  background: #f8fafc;
}
.doc-title {
  font-size: 20pt;
  font-weight: bold;
  color: #1e293b;
  margin: 0;
  padding: 0;
}
.doc-subtitle {
  font-size: 13pt;
  color: #475569;
  margin: 4pt 0 0 0;
}
.doc-code {
  font-size: 11pt;
  color: #64748b;
  font-family: monospace;
  direction: ltr;
  display: inline-block;
  margin-top: 4pt;
}

/* ═══════════ کادر محتوای اصلی ═══════════ */
.content-box {
  border: 1.5pt solid #1e40af;
  padding: 15pt 18pt;
  margin: 12pt 0;
  background: white;
  position: relative;
}
.content-box::before {
  content: '';
  position: absolute;
  top: 4pt;
  right: 4pt;
  bottom: 4pt;
  left: 4pt;
  border: 0.5pt solid #93c5fd;
  pointer-events: none;
}

/* ═══════════ عناوین ═══════════ */
h1 {
  font-size: 16pt;
  font-weight: bold;
  color: #1e40af;
  margin: 14pt 0 8pt 0;
  padding-bottom: 4pt;
  border-bottom: 2pt solid #1e40af;
}
h2 {
  font-size: 14pt;
  font-weight: bold;
  color: #1e293b;
  margin: 12pt 0 6pt 0;
  padding: 4pt 8pt;
  background: #eff6ff;
  border-right: 4pt solid #1e40af;
}
h3 {
  font-size: 12pt;
  font-weight: bold;
  color: #334155;
  margin: 10pt 0 4pt 0;
}
h4 {
  font-size: 11pt;
  font-weight: bold;
  color: #475569;
  margin: 8pt 0 4pt 0;
}

p {
  margin: 6pt 0;
  text-align: justify;
  text-justify: inter-word;
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

/* ═══════════ جداول ═══════════ */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0;
  font-size: 11pt;
}
table th, table td {
  border: 1pt solid #64748b;
  padding: 6pt 8pt;
  text-align: right;
  vertical-align: top;
}
table th {
  background: #1e40af;
  color: white;
  font-weight: bold;
  text-align: center;
}
table tr:nth-child(even) td {
  background: #f8fafc;
}

/* ═══════════ اطلاعات متادیتا ═══════════ */
.meta-grid {
  width: 100%;
  border-collapse: collapse;
  margin: 8pt 0;
  font-size: 11pt;
}
.meta-grid td {
  padding: 4pt 6pt;
  border-bottom: 0.5pt dashed #cbd5e1;
  vertical-align: top;
}
.meta-label {
  font-weight: bold;
  color: #475569;
  width: 30%;
}
.meta-value {
  color: #0f172a;
}

/* ═══════════ کادر برجسته ═══════════ */
.info-box {
  border: 1pt solid #3b82f6;
  background: #eff6ff;
  padding: 10pt 12pt;
  margin: 10pt 0;
  border-radius: 3pt;
}
.warning-box {
  border: 1pt solid #f59e0b;
  background: #fffbeb;
  padding: 10pt 12pt;
  margin: 10pt 0;
}
.success-box {
  border: 1pt solid #10b981;
  background: #ecfdf5;
  padding: 10pt 12pt;
  margin: 10pt 0;
}

/* ═══════════ امضاها ═══════════ */
.signature-table {
  width: 100%;
  margin-top: 40pt;
  border-collapse: collapse;
  page-break-inside: avoid;
}
.signature-table td {
  width: 50%;
  text-align: center;
  vertical-align: bottom;
  padding: 0 20pt;
  border: none;
}
.signature-box {
  padding-top: 40pt;
}
.signature-label {
  font-size: 11pt;
  color: #475569;
  margin-bottom: 40pt;
}
.signature-line {
  border-top: 1pt solid #1e40af;
  padding-top: 6pt;
  font-weight: bold;
  color: #1e293b;
  font-size: 11pt;
}
.signature-date {
  font-size: 9pt;
  color: #94a3b8;
  margin-top: 4pt;
}

/* ═══════════ پانویس ═══════════ */
.footer-line {
  margin-top: 30pt;
  padding-top: 8pt;
  border-top: 1pt solid #cbd5e1;
  text-align: center;
  font-size: 9pt;
  color: #94a3b8;
}

/* ═══════════ چاپ ═══════════ */
@media print {
  .no-print { display: none !important; }
  body { background: white; }
  .content-box { page-break-inside: auto; }
  h1, h2, h3 { page-break-after: avoid; }
  .signature-table { page-break-before: auto; }
}

/* Word-specific */
p, h1, h2, h3, h4, li {
  mso-line-height-rule: exactly;
}
.mso-page-orientation { page: Section1; }
</style>
</head>
<body>

<!-- ═══════════ سربرگ بالای سند ═══════════ -->
<table class="header-table" cellpadding="0" cellspacing="0">
  <tr>
    <td class="header-logo" width="100">
      \${LOGO_SVG}
    </td>
    <td class="header-text">
      <div class="header-company">\${companyName}</div>
      <div class="header-sub">\${companySub}</div>
      <div class="header-contact">\${companyAddress} | تلفن: \${companyPhone}</div>
    </td>
    <td width="120" style="text-align: left; vertical-align: top;">
      <div style="font-size: 9pt; color: #64748b;">
        تاریخ: \${new Date().toLocaleDateString('fa-IR')}
      </div>
      <div style="font-size: 9pt; color: #64748b; margin-top: 2pt;">
        صفحه: <span style="mso-field-code: PAGE"></span> از <span style="mso-field-code: NUMPAGES"></span>
      </div>
    </td>
  </tr>
</table>

<!-- ═══════════ عنوان سند ═══════════ -->
<div class="doc-header">
  <h1 class="doc-title" style="border: none; background: none; margin: 0; padding: 0;">\${opts.title}</h1>
  \${opts.subtitle ? '<div class="doc-subtitle">' + opts.subtitle + '</div>' : ''}
  \${opts.code ? '<div class="doc-code">' + opts.code + '</div>' : ''}
</div>

<!-- ═══════════ کادر محتوای اصلی ═══════════ -->
<div class="content-box">
\${opts.bodyHtml}
</div>

<!-- ═══════════ امضاها ═══════════ -->
<table class="signature-table" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <div class="signature-box">
        <div class="signature-label">\${signatures.right}</div>
        <div class="signature-line">&nbsp;</div>
        <div class="signature-date">تاریخ: .....................</div>
      </div>
    </td>
    <td>
      <div class="signature-box">
        <div class="signature-label">\${signatures.left}</div>
        <div class="signature-line">&nbsp;</div>
        <div class="signature-date">تاریخ: .....................</div>
      </div>
    </td>
  </tr>
</table>

<!-- ═══════════ پانویس ═══════════ -->
<div class="footer-line">
  این سند توسط سیستم حسابداری اپسای تولید شده است — \${new Date().toLocaleString('fa-IR')}
</div>

</body>
</html>\`;

  const blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
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
  w.document.write(\`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>\${title}</title>
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
  \${htmlContent}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  <\/script>
</body>
</html>\`);
  w.document.close();
}

/**
 * چاپ ساده در همان صفحه
 */
export function printCurrentContent(): void {
  window.print();
}
`;

fs.writeFileSync(ROOT + '/frontend/src/utils/word-export.ts', wordExport, 'utf8');
console.log('OK word-export.ts (نسخه حرفهای)');