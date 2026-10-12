// test/e2e/journals.e2e.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loginAdmin } from './_helpers';

let app: any;
let token: string;

before(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || (process.env.JWT_SECRET || '').length < 32) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  }
  if (!process.env.JWT_REFRESH_SECRET || (process.env.JWT_REFRESH_SECRET || '').length < 32) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  }
  const { createTestApp } = await import('./setup');
  app = await createTestApp();
  token = await loginAdmin(app);
});

after(async () => { if (app) await app.close(); });

const AUTH = () => ({ Authorization: 'Bearer ' + token });

test('GET /api/journals | no token -> 401', async () => {
  const res = await request(app.getHttpServer()).get('/api/journals');
  assert.equal(res.status, 401);
});

test('GET /api/journals | with admin -> 200 + array', async () => {
  const res = await request(app.getHttpServer()).get('/api/journals').set(AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body?.items), 'expected { items: [...] }, got: ' + JSON.stringify(Object.keys(res.body || {})));
});

test('GET /api/journals?status=DRAFT | valid enum -> 200', async () => {
  const res = await request(app.getHttpServer()).get('/api/journals?status=DRAFT').set(AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
});

test('GET /api/journals?status=INVALID | bad enum -> 400', async () => {
  const res = await request(app.getHttpServer()).get('/api/journals?status=NOT_A_STATUS').set(AUTH());
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

test('POST /api/journals | missing body -> 400', async () => {
  const res = await request(app.getHttpServer()).post('/api/journals').set(AUTH()).send({});
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

test('POST /api/journals | malformed lines -> 400', async () => {
  const res = await request(app.getHttpServer()).post('/api/journals').set(AUTH()).send({
    entryDate: '2026-01-01',
    description: 'تست',
    lines: 'not-an-array',
  });
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

test('GET /api/journals/unknown-id | 404 or 500', async () => {
  const res = await request(app.getHttpServer()).get('/api/journals/00000000-0000-0000-0000-000000000000').set(AUTH());
  assert.ok([404, 500].includes(res.status), 'unexpected: ' + res.status);
});
