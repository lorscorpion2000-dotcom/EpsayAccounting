console.log('═══ Timezone Check ═══\n');
console.log('process.env.TZ:', process.env.TZ || '(not set)');
console.log('Intl resolvedOptions:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('');

const now = new Date();
console.log('new Date():');
console.log('  .toString()     :', now.toString());
console.log('  .toISOString()  :', now.toISOString());
console.log('  .getHours()     :', now.getHours(), '(local)');
console.log('  .getUTCHours()  :', now.getUTCHours(), '(utc)');
console.log('  offset (min)    :', now.getTimezoneOffset());
console.log('');

// تست یک تاریخ مشخص
const d1 = new Date('2026-10-09');
console.log('new Date("2026-10-09"):');
console.log('  .toISOString()  :', d1.toISOString());
console.log('  .getHours()     :', d1.getHours());
console.log('  .getDate()      :', d1.getDate());
console.log('');

// تست Date.UTC
const d2 = new Date(Date.UTC(2026, 9, 9));
console.log('new Date(Date.UTC(2026, 9, 9)):');
console.log('  .toISOString()  :', d2.toISOString());
console.log('  .getDate()      :', d2.getDate());
console.log('');

// تست setHours
const d3 = new Date();
d3.setHours(0, 0, 0, 0);
console.log('today.setHours(0,0,0,0):');
console.log('  .toISOString()  :', d3.toISOString());
console.log('  .getHours()     :', d3.getHours());
console.log('');

// تست محاسبه با اختلاف روز
const a = new Date('2026-10-09T00:00:00Z');
const b = new Date('2026-10-09');
console.log('a = new Date("2026-10-09T00:00:00Z")');
console.log('b = new Date("2026-10-09")');
console.log('  a.getTime() === b.getTime() :', a.getTime() === b.getTime());