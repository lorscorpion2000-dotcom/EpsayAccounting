import { describe, it, expect } from 'vitest';
import {
  todayLocalISO, toLocalISO, currentJalaliYear, jalaliToLocalISO,
  firstDayOfCurrentJalaliYearISO,
} from '@/utils/local-date';

describe('todayLocalISO', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('matches local date fields, not UTC', () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(todayLocalISO()).toBe(expected);
  });
});

describe('toLocalISO', () => {
  it('returns empty for null/undefined/invalid', () => {
    expect(toLocalISO(null)).toBe('');
    expect(toLocalISO(undefined)).toBe('');
    expect(toLocalISO('')).toBe('');
    expect(toLocalISO('not-a-date')).toBe('');
  });
  it('formats a Date via local fields', () => {
    expect(toLocalISO(new Date(2026, 9, 11, 14, 0))).toBe('2026-10-11');
  });
  it('parses an ISO string', () => {
    expect(toLocalISO('2026-10-11')).toBe('2026-10-11');
  });
});

describe('currentJalaliYear', () => {
  it('returns a plausible Jalali year (1400-1420)', () => {
    const y = currentJalaliYear();
    expect(y).toBeGreaterThan(1400);
    expect(y).toBeLessThan(1420);
  });
});

describe('jalaliToLocalISO', () => {
  it('1404/01/01 maps to Gregorian March 2025', () => {
    const iso = jalaliToLocalISO(1404, 1, 1);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(iso.slice(0, 7)).toBe('2025-03');
  });
  it('1405/01/01 maps to Gregorian March 2026', () => {
    const iso = jalaliToLocalISO(1405, 1, 1);
    expect(iso.slice(0, 7)).toBe('2026-03');
  });
});

describe('firstDayOfCurrentJalaliYearISO', () => {
  it('returns YYYY-MM-DD in March', () => {
    const iso = firstDayOfCurrentJalaliYearISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(iso.slice(5, 7)).toBe('03');
  });
});
