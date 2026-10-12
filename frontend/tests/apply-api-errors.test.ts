import { describe, it, expect, vi } from 'vitest';
import { applyApiErrorsToForm } from '@/utils/api-error';

describe('applyApiErrorsToForm', () => {
  it('returns empty for non-axios errors and does not call setError', () => {
    const setError = vi.fn();
    const out = applyApiErrorsToForm(new Error('x'), setError as any);
    expect(out).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns empty when no response', () => {
    const setError = vi.fn();
    const out = applyApiErrorsToForm({ isAxiosError: true }, setError as any);
    expect(out).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
  });

  it('maps { errors: { field: msg } } shape', () => {
    const setError = vi.fn();
    const err: any = {
      isAxiosError: true,
      response: { status: 400, data: { errors: { username: 'bad', password: 'weak' } } },
    };
    const out = applyApiErrorsToForm(err, setError as any);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(out).toContain('username');
    expect(out).toContain('password');
  });

  it('maps { message: [{ field, message }] } shape', () => {
    const setError = vi.fn();
    const err: any = {
      isAxiosError: true,
      response: { status: 422, data: { message: [{ field: 'email', message: 'invalid' }] } },
    };
    const out = applyApiErrorsToForm(err, setError as any);
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'invalid' });
    expect(out).toEqual(['email']);
  });

  it('returns empty when no field errors present', () => {
    const setError = vi.fn();
    const err: any = { isAxiosError: true, response: { status: 400, data: {} } };
    const out = applyApiErrorsToForm(err, setError as any);
    expect(out).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
  });
});
