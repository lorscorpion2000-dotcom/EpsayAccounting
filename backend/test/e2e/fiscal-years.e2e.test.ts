// test/e2e/fiscal-years.e2e.test.ts
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

test('GET /api/fiscal-years | no token -> 401', async () => {
  const res = await request(app.getHttpServer()).get('/api/fiscal-years');
  assert.equal(res.status, 401);
});

test('GET /api/fiscal-years | with admin -> 200 + array', async () => {
  const res = await request(app.getHttpServer()).get('/api/fiscal-years').set(AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body), 'expected array');
});

test('GET /api/fiscal-years/current | -> 200 or 404', async () => {
  const res = await request(app.getHttpServer()).get('/api/fiscal-years/current').set(AUTH());
  assert.ok([200, 404].includes(res.status), 'unexpected: ' + res.status);
});

test('POST /api/fiscal-years | missing body -> 400', async () => {
  const res = await request(app.getHttpServer()).post('/api/fiscal-years').set(AUTH()).send({});
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

test('POST /api/fiscal-years | extra field (whitelist) -> 400', async () => {
  const res = await request(app.getHttpServer()).post('/api/fiscal-years').set(AUTH()).send({
    code: 'TEST-2999',
    name: 'سال تستی',
    startDate: '2999-01-01',
    endDate: '2999-12-31',
    rogueField: 'should-be-rejected',
  });
  assert.equal(res.status, 400, 'expected 400 on non-whitelisted field, body: ' + JSON.stringify(res.body));
});

test('GET /api/fiscal-years/deleted/list | with admin -> 200', async () => {
  const res = await request(app.getHttpServer()).get('/api/fiscal-years/deleted/list').set(AUTH());
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
});
