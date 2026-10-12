import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toLocalDateString, startOfLocalDay, endOfLocalDay,
  fromDateString, localDate, dayRange, lastNDaysRange,
} from '../../src/common/utils/date.util';

test('toLocalDateString: formats as YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 11, 14, 30); // Oct 11 2026 local
  assert.equal(toLocalDateString(d), '2026-10-11');
});

test('toLocalDateString: returns "" for empty/invalid', () => {
  assert.equal(toLocalDateString(null), '');
  assert.equal(toLocalDateString(undefined), '');
  assert.equal(toLocalDateString(''), '');
  assert.equal(toLocalDateString('not-a-date'), '');
});

test('startOfLocalDay: zeroes time', () => {
  const d = startOfLocalDay(new Date(2026, 5, 15, 18, 45, 30, 123));
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
  assert.equal(d.getMilliseconds(), 0);
  assert.equal(d.getDate(), 15);
});

test('endOfLocalDay: 23:59:59.999', () => {
  const d = endOfLocalDay(new Date(2026, 5, 15, 0, 0, 0, 0));
  assert.equal(d.getHours(), 23);
  assert.equal(d.getMinutes(), 59);
  assert.equal(d.getSeconds(), 59);
  assert.equal(d.getMilliseconds(), 999);
});

test('fromDateString: parses YYYY-MM-DD as UTC midnight', () => {
  const d = fromDateString('2026-10-11');
  assert.ok(d);
  assert.equal(d!.getUTCFullYear(), 2026);
  assert.equal(d!.getUTCMonth(), 9);
  assert.equal(d!.getUTCDate(), 11);
});

test('fromDateString: null for empty/invalid', () => {
  assert.equal(fromDateString(null), null);
  assert.equal(fromDateString(''), null);
  assert.equal(fromDateString('foo'), null);
});

test('localDate: constructs local date (month 1-based)', () => {
  const d = localDate(2026, 10, 11);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 11);
});

test('dayRange: start-of-day and end-of-day, same day', () => {
  const r = dayRange(new Date(2026, 5, 15, 12, 0));
  assert.equal(r.gte.getHours(), 0);
  assert.equal(r.lte.getHours(), 23);
  assert.equal(r.gte.getDate(), 15);
  assert.equal(r.lte.getDate(), 15);
});

test('lastNDaysRange: spans approximately N days', () => {
  const r = lastNDaysRange(7);
  const spanMs = r.lte.getTime() - r.gte.getTime();
  assert.ok(spanMs >= 6 * 24 * 3600 * 1000, 'should span at least 6 full days');
});
