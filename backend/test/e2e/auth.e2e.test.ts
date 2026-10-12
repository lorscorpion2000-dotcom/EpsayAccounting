// test/e2e/auth.e2e.test.ts — PoC e2e for auth endpoints
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app: any;

before(async () => {
  // Env must be set BEFORE AppModule/env.validation loads
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || (process.env.JWT_SECRET || '').length < 32) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  }
  if (!process.env.JWT_REFRESH_SECRET || (process.env.JWT_REFRESH_SECRET || '').length < 32) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  }
  const { createTestApp } = await import('./setup');
  app = await createTestApp();
});

after(async () => { if (app) await app.close(); });

const ADMIN = { username: 'admin', password: 'Admin@1404' };

test('POST /api/auth/login | valid credentials -> 200 + tokens', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send(ADMIN);
  assert.equal(res.status, 201, 'body: ' + JSON.stringify(res.body));
  assert.ok(res.body.accessToken, 'accessToken missing');
  assert.ok(res.body.refreshToken, 'refreshToken missing');
});

test('POST /api/auth/login | wrong password -> 401', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'WrongPass@9999' });
  assert.equal(res.status, 401);
});

test('POST /api/auth/login | invalid body -> 400', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username: 'a' }); // missing password, username < 3
  assert.equal(res.status, 400);
});

test('GET /api/auth/me | without token -> 401', async () => {
  const res = await request(app.getHttpServer()).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me | with valid token -> 200 + user', async () => {
  const login = await request(app.getHttpServer()).post('/api/auth/login').send(ADMIN);
  assert.equal(login.status, 201, 'login failed: ' + JSON.stringify(login.body));
  const token = login.body.accessToken;

  const res = await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Authorization', 'Bearer ' + token);
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.equal(res.body.username, 'admin');
});
