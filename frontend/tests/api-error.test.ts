import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from '@/utils/api-error';

function axiosError(status: number, data: any, code?: string): any {
  return { isAxiosError: true, code, response: { status, data } };
}

describe('getApiErrorMessage', () => {
  it('returns network error when no response', () => {
    expect(getApiErrorMessage({ isAxiosError: true })).toContain('ارتباط');
  });
  it('returns timeout message for ECONNABORTED', () => {
    expect(getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' })).toContain('مهلت');
  });
  it('extracts first item from array message', () => {
    const err = axiosError(400, { message: ['field required', 'other'] });
    expect(getApiErrorMessage(err)).toBe('field required');
  });
  it('extracts string message', () => {
    const err = axiosError(400, { message: 'custom error' });
    expect(getApiErrorMessage(err)).toBe('custom error');
  });
  it('falls back to STATUS_FA on 401 with no message', () => {
    expect(getApiErrorMessage(axiosError(401, {}))).toContain('نام کاربری');
  });
  it('falls back to STATUS_FA on 500', () => {
    expect(getApiErrorMessage(axiosError(500, {}))).toContain('داخلی');
  });
  it('handles unknown status code with number in message', () => {
    expect(getApiErrorMessage(axiosError(418, {}))).toContain('418');
  });
  it('handles plain Error', () => {
    expect(getApiErrorMessage(new Error('plain error'))).toBe('plain error');
  });
  it('handles null/undefined', () => {
    expect(getApiErrorMessage(null)).toContain('ناشناخته');
    expect(getApiErrorMessage(undefined)).toContain('ناشناخته');
  });
});
