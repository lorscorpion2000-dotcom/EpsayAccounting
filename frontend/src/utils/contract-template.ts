// src/utils/contract-template.ts
// Substitutes {{var}} placeholders in contract template HTML.
// Supports dot notation: {{party.fullName}}, {{project.name}}, etc.
//
// Usage:
//   const html = renderContractTemplate(contract.bodyHtml, contract);
//   // {{party.fullName}} → "علی رضایی"

import { formatJalaliDate, formatNumber } from './format';

type AnyRecord = Record<string, any>;

/**
 * Resolve a dotted path like "party.fullName" against the context object.
 * Returns empty string if not found.
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

  // Jalali date
  if (key.toLowerCase().endsWith('date') || /At$/.test(key)) {
    return formatJalaliDate(value);
  }

  // Numeric fields
  if (typeof value === 'number') {
    return formatNumber(value);
  }

  // Numeric strings for known money fields
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
 * Render a template HTML string using a contract object as context.
 * Any {{path.to.value}} gets replaced with the formatted value.
 * Unknown paths are replaced with "—" (or a fallback if provided).
 */
export function renderContractTemplate(
  html: string | null | undefined,
  contract: AnyRecord | null | undefined,
  options?: { fallback?: string; throwOnMissing?: boolean },
): string {
  if (!html) return '';
  const fallback = options?.fallback ?? '—';

  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = resolvePath(contract, path);
    if (value === undefined || value === null || value === '') {
      return options?.throwOnMissing ? match : fallback;
    }
    return formatValue(value, path);
  });
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