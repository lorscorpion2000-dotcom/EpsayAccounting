/**
 * خروجی HTML به Word — نسخه ساده و پایدار
 */

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

/**
 * لوگو رو از سرور می‌گیره و به base64 تبدیل می‌کنه
 * از icon-192 استفاده می‌کنیم چون کوچیک‌تره (28KB به جای 871KB)
 */
async function fetchLogoAsBase64(): Promise<string> {
  try {
    const urls = [
      window.location.origin + '/images/icon-192.png',
      window.location.origin + '/images/logo.png',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { /* try next */ }
    }
    return '';
  } catch {
    return '';
  }
}

export async function exportHtmlToWord(opts: WordExportOptions): Promise<void> {
  const companyName = opts.companyName || 'استودیو معماری اپسای';
  const signatures = opts.signatures || {
    left: 'امضای کارفرما',
    right: 'امضای پیمانکار',
  };

  const logoData = await fetchLogoAsBase64();

  // سربرگ بالای صفحه اول (بدون mso-header که Word رو هنگ می‌کنه)
  const headerBlock = `
    <!--[if gte mso 9]><div style='mso-element:header' id=h1><![endif]-->
    <div style="text-align:center;padding:2pt 0 5pt;border-bottom:0.5pt solid #cbd5e1;margin-bottom:6pt;">
      ${logoData ? `<img src="${logoData}" alt="لوگو" style="height:20pt;width:auto;display:block;margin:0 auto 2pt;" />` : ''}
      <div style="font-family:'B Nazanin','Vazirmatn',Tahoma,sans-serif;font-size:11pt;font-weight:bold;color:#1e3a8a;">${companyName}</div>
    </div>
    <!--[if gte mso 9]></div><![endif]-->
  `;

  // فوتر پایین (انتهای سند، نه در همه صفحات)
  const footerBlock = `
    <!--[if gte mso 9]><div style='mso-element:footer' id=f1><![endif]-->
    <div style="margin-top:20pt;padding-top:6pt;border-top:0.5pt solid #cbd5e1;">
      <table style="width:100%;border-collapse:collapse;direction:rtl;">
        <tr>
          <td style="width:50%;text-align:center;font-family:'B Nazanin','Vazirmatn',Tahoma,sans-serif;font-size:9pt;color:#1e3a8a;font-weight:bold;padding:2pt 0;">
            ${signatures.left}
          </td>
          <td style="width:50%;text-align:center;font-family:'B Nazanin','Vazirmatn',Tahoma,sans-serif;font-size:11pt;color:#1e3a8a;font-weight:bold;padding:4pt 0;">
            ${signatures.right}
          </td>
        </tr>
        <tr>
          <td style="width:50%;text-align:center;font-family:'B Nazanin','Vazirmatn',Tahoma,sans-serif;font-size:8pt;color:#475569;padding:14pt 0 3pt;">
            &nbsp;
          </td>
          <td style="width:50%;text-align:center;font-family:'B Nazanin','Vazirmatn',Tahoma,sans-serif;font-size:10pt;color:#475569;padding:20pt 0 4pt;">
            &nbsp;
          </td>
        </tr>
      </table>
    </div>
    <!--[if gte mso 9]></div><![endif]-->
  `;

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
  margin: 2.2cm 1cm 1.8cm 1cm;
  mso-paper-source: 0;
  mso-header-margin: 0.5cm;
  mso-footer-margin: 0.4cm;
  mso-header: h1;
  mso-footer: f1;
}

body {
  font-family: 'B Nazanin', 'Vazirmatn', 'IRANSans', Tahoma, sans-serif;
  font-size: 9pt;
  line-height: 1.6;
  color: #0f172a;
  direction: rtl;
  text-align: right;
  margin: 0;
  padding: 0;
}

table { border-collapse: collapse; width: 100%; }

.contract-body { font-family: 'B Nazanin', 'Vazirmatn', Tahoma, sans-serif; direction: rtl; text-align: right; line-height: 1.6; font-size: 9pt; color: #0f172a; }
.contract-body h1, .contract-body h2, .contract-body h3 { color: #1e40af; font-weight: bold; margin: 8pt 0 4pt; }
.contract-body h2.clause-heading { font-size: 10.5pt; border-right: 3pt solid #1e40af; padding-right: 6pt; }
.contract-body h3.sub-heading { font-size: 9.5pt; border-right: 2pt solid #93c5fd; padding-right: 5pt; }
.contract-body p { margin: 0 0 5pt; text-align: justify; }
.contract-body table th, .contract-body table td { border: 0.5pt solid #cbd5e1; padding: 1.5pt 3pt; font-size: 8pt; }

.no-print { display: none !important; }
</style>
</head>
<body>

${headerBlock}

${opts.bodyHtml}

${footerBlock}

</body>
</html>`;

  // دانلود
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename.endsWith('.doc') ? opts.filename : opts.filename + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * چاپ HTML در پنجره جدید
 */
export function printHtmlInNewWindow(
  title: string,
  bodyHtml: string,
  options?: { subtitle?: string; code?: string }
): void {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('پنجره چاپ باز نشد — پاپ‌آپ‌ها رو اجازه بده');
    return;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 20mm 12mm 18mm 12mm; }
  html, body { margin: 0; padding: 0; background: white; }
  body {
    font-family: 'Vazirmatn', 'B Nazanin', Tahoma, sans-serif;
    direction: rtl;
    text-align: right;
    color: #0f172a;
    line-height: 1.9;
    font-size: 11pt;
  }
  .contract-body { font-family: 'Vazirmatn', 'B Nazanin', Tahoma, sans-serif; direction: rtl; text-align: right; line-height: 1.9; }
  .contract-body h1, .contract-body h2, .contract-body h3 { color: #1e40af; font-weight: bold; }
  .contract-body h2.clause-heading { font-size: 14pt; border-right: 3pt solid #1e40af; padding-right: 8pt; margin: 12pt 0 6pt; }
  .contract-body h3.sub-heading { font-size: 12pt; border-right: 2pt solid #93c5fd; padding-right: 6pt; margin: 8pt 0 4pt; }
  .contract-body p { margin: 0 0 6pt; text-align: justify; }
  .contract-body table { border-collapse: collapse; width: 100%; }
  .contract-body table th, .contract-body table td { border: 1px solid #cbd5e1; padding: 3px 5px; font-size: 10pt; }
</style>
</head>
<body>
${options?.subtitle ? `<div style="text-align:center;color:#475569;font-size:10pt;margin-bottom:8pt;">${options.subtitle}</div>` : ''}
${bodyHtml}
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();

  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };
}
