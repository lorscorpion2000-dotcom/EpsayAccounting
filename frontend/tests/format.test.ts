import { describe, it, expect } from 'vitest';
import {
  toPersianDigits, toEnglishDigits, formatNumber, formatRial,
  formatPercent, formatJalaliDate,
} from '@/utils/format';

describe('toPersianDigits', () => {
  it('converts ASCII digits to Persian', () => {
    expect(toPersianDigits(123)).toBe('۱۲۳');
    expect(toPersianDigits('0')).toBe('۰');
  });
  it('returns — for null/undefined', () => {
    expect(toPersianDigits(null)).toBe('—');
    expect(toPersianDigits(undefined)).toBe('—');
  });
});

describe('toEnglishDigits', () => {
  it('converts Persian digits to ASCII', () => {
    expect(toEnglishDigits('۱۲۳')).toBe('123');
    expect(toEnglishDigits('۰')).toBe('0');
  });
  it('converts Arabic-Indic digits to ASCII', () => {
    expect(toEnglishDigits('١٢٣')).toBe('123');
  });
  it('leaves non-digit characters intact', () => {
    expect(toEnglishDigits('abc۱۲۳xyz')).toBe('abc123xyz');
  });
});

describe('formatNumber', () => {
  it('formats small numbers with Persian digits', () => {
    expect(formatNumber(12)).toBe('۱۲');
    expect(formatNumber(0)).toBe('۰');
  });
  it('adds thousands separator', () => {
    const out = formatNumber(1000);
    expect(out).toContain('۱');
    expect(out).toContain('۰۰۰');
  });
  it('handles decimals with fixed digits', () => {
    const out = formatNumber(1234.5, 2);
    expect(out).toContain('۱');
    expect(out).toContain('۵۰');
  });
  it('returns — for empty/invalid', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber('')).toBe('—');
    expect(formatNumber('abc')).toBe('—');
  });
  it('accepts string numbers', () => {
    expect(formatNumber('42')).toBe('۴۲');
  });
});

describe('formatRial', () => {
  it('appends ریال', () => {
    const out = formatRial(1000);
    expect(out).toContain('ریال');
    expect(out).toContain('۱');
  });
});

describe('formatPercent', () => {
  it('appends ٪', () => {
    expect(formatPercent(50)).toBe('۵۰٪');
  });
  it('returns — for null', () => {
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatJalaliDate', () => {
  it('returns — for null/invalid', () => {
    expect(formatJalaliDate(null)).toBe('—');
    expect(formatJalaliDate('not-a-date')).toBe('—');
  });
  it('formats a valid date without error', () => {
    const out = formatJalaliDate(new Date(2026, 0, 1));
    expect(out).not.toBe('—');
    expect(out.length).toBeGreaterThan(0);
  });
});
