import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCode, withUniqueRetry } from '../../src/shared/utils/code-generator';

/**
 * mock Prisma با Proxy: هر prop یک model می‌شود که findFirst دارد.
 * seed: { modelName: [{ code: 'TH-0001' }, ...] }
 */
function mockPrisma(seed: Record<string, Array<{ code: string }>> = {}) {
  return new Proxy({} as any, {
    get(_t, prop: string) {
      if (typeof prop !== 'string') return undefined;
      const all = seed[prop] || [];
      return {
        findFirst: async (q: any) => {
          const where = q?.where?.code;
          if (typeof where === 'string') {
            return all.find((r) => r.code === where) ?? null;
          }
          if (where?.startsWith) {
            const m = all.filter((r) => r.code.startsWith(where.startsWith));
            m.sort((a, b) => b.code.localeCompare(a.code));
            return m[0] ?? null;
          }
          return null;
        },
      };
    },
  });
}

test('generateCode: empty model → prefix + 0001', async () => {
  const prisma = mockPrisma({ thing: [] });
  const code = await generateCode(prisma, 'thing', 'code', 'TH-');
  assert.equal(code, 'TH-0001');
});

test('generateCode: picks max + 1 (handles gaps)', async () => {
  const prisma = mockPrisma({
    thing: [{ code: 'TH-0001' }, { code: 'TH-0007' }, { code: 'TH-0003' }],
  });
  assert.equal(await generateCode(prisma, 'thing', 'code', 'TH-'), 'TH-0008');
});

test('generateCode: honors custom pad', async () => {
  const prisma = mockPrisma({ thing: [] });
  assert.equal(
    await generateCode(prisma, 'thing', 'code', 'X-', { pad: 6 }),
    'X-000001',
  );
});

test('generateCode: unknown model → throws', async () => {
  const prisma = new Proxy({} as any, {
    get: () => undefined,
  });
  await assert.rejects(
    () => generateCode(prisma, 'ghost', 'code', 'Z-'),
    /unknown model/,
  );
});

test('withUniqueRetry: succeeds on first try (no retry)', async () => {
  let calls = 0;
  const r = await withUniqueRetry(async () => { calls++; return 'ok'; });
  assert.equal(r, 'ok');
  assert.equal(calls, 1);
});

test('withUniqueRetry: retries on P2002 and succeeds', async () => {
  let calls = 0;
  const r = await withUniqueRetry(async () => {
    calls++;
    if (calls < 3) {
      const e: any = new Error('Unique constraint failed');
      e.code = 'P2002';
      throw e;
    }
    return 'done';
  });
  assert.equal(r, 'done');
  assert.equal(calls, 3);
});

test('withUniqueRetry: gives up after maxAttempts', async () => {
  let calls = 0;
  await assert.rejects(
    () => withUniqueRetry(async () => {
      calls++;
      const e: any = new Error('Unique constraint failed');
      e.code = 'P2002';
      throw e;
    }, 2),
    /Unique constraint/,
  );
  assert.equal(calls, 2);
});

test('withUniqueRetry: does not retry non-P2002', async () => {
  let calls = 0;
  await assert.rejects(
    () => withUniqueRetry(async () => { calls++; throw new Error('some other'); }),
    /some other/,
  );
  assert.equal(calls, 1);
});
