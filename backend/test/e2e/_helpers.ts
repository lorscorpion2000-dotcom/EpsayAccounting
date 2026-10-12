// test/e2e/_helpers.ts
import request from 'supertest';

const ADMIN = { username: 'admin', password: 'Admin@1404' };

export async function loginAdmin(app: any): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send(ADMIN);
  if (res.status !== 201) throw new Error('admin login failed: ' + JSON.stringify(res.body));
  return res.body.accessToken as string;
}
