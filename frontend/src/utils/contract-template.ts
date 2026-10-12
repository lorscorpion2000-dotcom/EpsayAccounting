// src/utils/contract-template.ts
// Substitutes {{var}} placeholders in contract template HTML.
// F3: escape values + sanitize final HTML (DOMPurify).
//
// Usage:
//   const html = renderContractTemplate(contract.bodyHtml, contract);
//   // {{party.fullName}} → "علی رضایی"
//   // values are HTML-escaped, final HTML is sanitized

import DOMPurify from 'dompurify';
import { formatJalaliDate, formatNumber } from './format';

type AnyRecord = Record<string, any>;

// ═══════════════════════════════════════════════════════════
// F3: HTML escape helper
// ═══════════════════════════════════════════════════════════
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════
// F3: DOMPurify config for contract template
// ═══════════════════════════════════════════════════════════
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p','b','i','u','strong','em','br','hr','span','div','section','article',
    'h1','h2','h3','h4','h5','h6',
    'table','thead','tbody','tfoot','tr','td','th','caption','colgroup','col',
    'ul','ol','li',
    'a',
  ],
  ALLOWED_ATTR: [
    'style','dir','class','title','colspan','rowspan','width','height','align','valign',
    'href','target','rel',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script','iframe','object','embed','form','input','button','textarea','select','style','link','meta'],
  FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onfocus','onblur','onchange','onsubmit','onmouseenter','onmouseleave'],
};

/**
 * Resolve a dotted path like "party.fullName" against the context object.
 * Returns undefined if not found.
 */
function resolvePath(obj: AnyRecord | null | undefined, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Format a resolved value for display.
 * Dates → Jalali, numbers with currency suffix → formatted with thousand separators.
 */
function formatValue(value: any, key: string): string {
  if (value === null || value === undefined || value === '') return '—';

  if (key.toLowerCase().endsWith('date') || /At$/.test(key)) {
    return formatJalaliDate(value);
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (
    typeof value === 'string' &&
    /^\d+(\.\d+)?$/.test(value) &&
    /amount|salary|wage|total/i.test(key)
  ) {
    return formatNumber(Number(value));
  }

  return String(value);
}

/**
 * F3: ساخت جدول اجزای اجرای قرارداد — با escape مقادیر
 */
function buildItemsTable(items: any[] | null | undefined): string {
  if (!items || items.length === 0) {
    return '<span style="color:#94a3b8;font-style:italic">(هیچ ردیفی برای اجزای اجرا ثبت نشده است)</span>';
  }
  const fmt = (v: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-US');
  };
  const th = 'border:1px solid #cbd5e1;padding:1px 3px;background:#f1f5f9;font-size:8px;font-weight:bold;text-align:center';
  const td = 'border:1px solid #cbd5e1;padding:1px 3px;font-size:8px;vertical-align:top';
  const tdr = td + ';text-align:right';
  const tdc = td + ';text-align:center';
  const tdn = td + ';text-align:left;font-family:monospace;direction:ltr';

  let rows = '';
  let total = 0;
  items.forEach((it: any, idx: number) => {
    const qty = Number(it.quantity) || 0;
    const up = Number(it.unitPrice) || 0;
    const lineTotal = qty * up;
    total += lineTotal;
    rows += `
      <tr>
        <td style="${tdc}">${idx + 1}</td>
        <td style="${tdr}">${escapeHtml(it.description || '—')}</td>
        <td style="${tdc}">${escapeHtml(it.unit || '—')}</td>
        <td style="${tdn}">${fmt(qty)}</td>
        <td style="${tdn}">${fmt(up)}</td>
        <td style="${tdn}">${fmt(lineTotal)}</td>
      </tr>`;
  });

  return `
    <table style="width:100%;border-collapse:collapse;margin:3px 0;direction:rtl;font-family:'Vazirmatn',Tahoma,sans-serif;font-size:8px">
      <thead>
        <tr>
          <th style="${th};width:24px">ردیف</th>
          <th style="${th};text-align:right">شرح</th>
          <th style="${th};width:48px">واحد</th>
          <th style="${th};width:48px">تعداد</th>
          <th style="${th};width:110px">مبلغ واحد</th>
          <th style="${th};width:110px">جمع</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="background:#ecfdf5;font-weight:bold">
          <td colspan="5" style="${tdr}">جمع کل:</td>
          <td style="${tdn};font-weight:bold">${fmt(total)}</td>
        </tr>
      </tbody>
    </table>`;
}

/**
 * F3: Render a template HTML string using a contract object as context.
 * Values are HTML-escaped before substitution.
 * Final HTML is sanitized with DOMPurify.
 */
export function renderContractTemplate(
  html: string | null | undefined,
  contract: AnyRecord | null | undefined,
  options?: { fallback?: string; throwOnMissing?: boolean },
): string {
  if (!html) return '';
  const fallback = options?.fallback ?? '—';

  // ۱) {{itemsTable}}
  let out = html.replace(/\{\{\s*itemsTable\s*\}\}/g, buildItemsTable(contract?.items));

  // ۲) {{path.to.value}} — with escape
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = resolvePath(contract, path);
    if (value === undefined || value === null || value === '') {
      return options?.throwOnMissing ? match : escapeHtml(fallback);
    }
    const formatted = formatValue(value, path);
    return escapeHtml(String(formatted));
  });

  // ۳) sanitize
  return DOMPurify.sanitize(out, PURIFY_CONFIG);
}

/**
 * List of available placeholders (for UI hints in the templates editor).
 */
export const CONTRACT_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: 'code', label: 'کد قرارداد' },
  { key: 'title', label: 'عنوان' },
  { key: 'subject', label: 'موضوع قرارداد' },
  { key: 'registrationNumber', label: 'شماره ثبت' },
  { key: 'registrationDate', label: 'تاریخ ثبت' },
  { key: 'startDate', label: 'تاریخ شروع' },
  { key: 'endDate', label: 'تاریخ پایان' },
  { key: 'durationText', label: 'مدت' },
  { key: 'workLocation', label: 'محل کار' },
  { key: 'workHoursPerWeek', label: 'ساعت کار در هفته' },
  { key: 'totalAmount', label: 'مبلغ کل' },
  { key: 'salaryMonthly', label: 'حقوق ماهیانه' },
  { key: 'salaryDaily', label: 'دستمزد روزانه' },
  { key: 'salaryHourly', label: 'دستمزد ساعتی' },
  { key: 'guaranteeType', label: 'نوع تضمین' },
  { key: 'guaranteeNumber', label: 'شماره تضمین' },
  { key: 'guaranteeAmount', label: 'مبلغ تضمین' },
  { key: 'guaranteeBank', label: 'بانک تضمین' },
  { key: 'supervisorName', label: 'نام ناظر' },
  { key: 'companySignerName', label: 'امضاکننده شرکت' },
  { key: 'workerSignerName', label: 'امضاکننده کارگر' },
  { key: 'party.fullName', label: 'نام طرف قرارداد' },
  { key: 'party.fatherName', label: 'نام پدر' },
  { key: 'party.nationalId', label: 'کد ملی' },
  { key: 'party.economicCode', label: 'کد اقتصادی' },
  { key: 'party.registrationNumber', label: 'شماره ثبت شرکت' },
  { key: 'party.birthDate', label: 'تاریخ تولد' },
  { key: 'party.mobilePhone', label: 'موبایل' },
  { key: 'party.landlinePhone', label: 'تلفن ثابت' },
  { key: 'party.address', label: 'آدرس' },
  { key: 'party.postalCode', label: 'کد پستی' },
  { key: 'party.bankName', label: 'نام بانک' },
  { key: 'party.bankAccount', label: 'شماره حساب' },
  { key: 'party.bankSheba', label: 'شماره شبا' },
  { key: 'party.job', label: 'شغل' },
  { key: 'party.education', label: 'تحصیلات' },
  { key: 'party.insuranceNumber', label: 'شماره بیمه' },
  { key: 'project.name', label: 'نام پروژه' },
  { key: 'project.code', label: 'کد پروژه' },
];
