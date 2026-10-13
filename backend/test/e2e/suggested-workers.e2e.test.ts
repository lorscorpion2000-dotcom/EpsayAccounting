// test/e2e/suggested-workers.e2e.test.ts
// GET /api/site-ops/daily-reports/suggested-workers
// از Attendance ماه شمسی، پرسنل پیشنهادی را با تجمیع روز/ساعت برمی‌گرداند
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { loginAdmin } from './_helpers';
import * as jalaali from 'jalaali-js';

let app: any;
let token: string;
let prisma: any;
let partnerId: string | null = null;
let profileId: string | null = null;
let attendanceIds: string[] = [];

const PARTNER_CODE = 'E2E-SW-' + Date.now();
const PROFILE_CODE = 'E2E-SWP-' + Date.now();

// تاریخ جاری شمسی
function todayJalali() {
  const now = new Date();
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

before(async () => {
  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-chars-xxx';
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32-xxx';
  }
  const { createTestApp } = await import('./setup');
  const { PrismaService } = await import('../../src/shared/prisma/prisma.service');

  app = await createTestApp();
  prisma = app.get(PrismaService);
  token = await loginAdmin(app);
});

after(async () => {
  if (prisma) {
    try {
      if (attendanceIds.length) {
        await prisma.attendance.deleteMany({ where: { id: { in: attendanceIds } } });
      }
      if (profileId) {
        await prisma.employeeProfile.deleteMany({ where: { id: profileId } });
      }
      if (partnerId) {
        await prisma.partner.deleteMany({ where: { id: partnerId } });
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }
  if (app) await app.close();
});

const AUTH = () => ({ Authorization: 'Bearer ' + token });

// ─────────────────────────────────────────────────────────────
// 1) بدون توکن → 401
// ─────────────────────────────────────────────────────────────
test('suggested-workers | no token -> 401', async () => {
  const j = todayJalali();
  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .query({ year: j.jy, month: j.jm });
  assert.equal(res.status, 401);
});

// ─────────────────────────────────────────────────────────────
// 2) پارامترهای غایب → 400
// ─────────────────────────────────────────────────────────────
test('suggested-workers | missing year/month -> 400', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .set(AUTH());
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

// ─────────────────────────────────────────────────────────────
// 3) ماه غیرمعتبر → 400
// ─────────────────────────────────────────────────────────────
test('suggested-workers | invalid month (13) -> 400', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .set(AUTH())
    .query({ year: 1405, month: 13 });
  assert.equal(res.status, 400, 'body: ' + JSON.stringify(res.body));
});

// ─────────────────────────────────────────────────────────────
// 4) ماه بدون داده → employees: []
// ─────────────────────────────────────────────────────────────
test('suggested-workers | empty month -> employees=[]', async () => {
  // از یک سال خیلی دور استفاده کن که قطعاً داده ندارد
  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .set(AUTH())
    .query({ year: 1300, month: 1 });
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.employees));
  assert.equal(res.body.employees.length, 0);
});

// ─────────────────────────────────────────────────────────────
// 5) با داده واقعی → پرسنل با attendanceDays >= 1
// ─────────────────────────────────────────────────────────────
test('suggested-workers | returns partner with attendance in current Jalali month', async () => {
  const j = todayJalali();

  // تبدیل روز اول ماه شمسی به میلادی
  const { gy, gm, gd } = jalaali.toGregorian(j.jy, j.jm, 1);
  const attendanceDate = new Date(Date.UTC(gy, gm - 1, gd));

  // 1) Partner(type=EMPLOYEE)
  const partner = await prisma.partner.create({
    data: {
      code: PARTNER_CODE,
      name: 'تست پیشنهادی ' + j.jy + '/' + j.jm,
      type: 'EMPLOYEE',
      isActive: true,
    },
  });
  partnerId = partner.id;

  // 2) EmployeeProfile
  const profile = await prisma.employeeProfile.create({
    data: {
      partnerId: partner.id,
      employeeCode: PROFILE_CODE,
      employeeType: 'DAILY_WAGE',
      position: 'بنا',
      isActive: true,
    },
  });
  profileId = profile.id;

  // 3) Attendance در ماه جاری
  const att1 = await prisma.attendance.create({
    data: {
      employeeId: partner.id,
      attendanceDate,
      status: 'PRESENT',
      workHours: 8,
      overtimeHours: 1,
    },
  });
  attendanceIds.push(att1.id);

  // یک روز دیگر با فرض اینکه ماه بیشتر از ۵ روز دارد
  const { gy: gy2, gm: gm2, gd: gd2 } = jalaali.toGregorian(j.jy, j.jm, 5);
  const att2 = await prisma.attendance.create({
    data: {
      employeeId: partner.id,
      attendanceDate: new Date(Date.UTC(gy2, gm2 - 1, gd2)),
      status: 'PRESENT',
      workHours: 8,
      overtimeHours: 0,
    },
  });
  attendanceIds.push(att2.id);

  // endpoint
  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .set(AUTH())
    .query({ year: j.jy, month: j.jm });
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.employees));

  const found = res.body.employees.find((e: any) => e.employeeId === partner.id);
  assert.ok(found, 'شخص تست در لیست پیشنهادی پیدا نشد. employees: ' + JSON.stringify(res.body.employees));
  assert.equal(found.employeeCode, PROFILE_CODE);
  assert.equal(found.position, 'بنا');
  assert.equal(found.employeeType, 'DAILY_WAGE');
  assert.equal(found.attendanceDays, 2);
  assert.equal(Number(found.totalWorkHours), 16);
  assert.equal(Number(found.totalOvertimeHours), 1);
  assert.ok(found.lastAttendanceDate, 'lastAttendanceDate باید مقدار داشته باشد');
});

// ─────────────────────────────────────────────────────────────
// 6) فیلتر projectId وقتی تطابق ندارد → پرسنل بازنمی‌گردد
// ─────────────────────────────────────────────────────────────
test('suggested-workers | projectId filter excludes non-matching profile', async () => {
  const j = todayJalali();
  // UUID یک پروژه که وجود ندارد
  const fakeProject = '00000000-0000-0000-0000-000000000000';

  const res = await request(app.getHttpServer())
    .get('/api/site-ops/daily-reports/suggested-workers')
    .set(AUTH())
    .query({ year: j.jy, month: j.jm, projectId: fakeProject });
  assert.equal(res.status, 200, 'body: ' + JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.employees));

  // شخص تست نباید در نتیجه باشد چون projectId در پروفایلش null است
  const found = res.body.employees.find((e: any) => e.employeeId === partnerId);
  assert.equal(found, undefined, 'با فیلتر پروژه، پرسنل باید مستثنا شود');
});
