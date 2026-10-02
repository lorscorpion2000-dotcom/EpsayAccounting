import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/settings/pages/UsersPage.tsx';
const c = fs.readFileSync(f, 'utf8');

const checks = [
  { name: 'import UserFormModal', regex: "import UserFormModal" },
  { name: 'state showModal', regex: 'const \\[showModal' },
  { name: 'state editing', regex: 'const \\[editing' },
  { name: 'onClick setShowModal', regex: 'setShowModal\\(true\\)' },
  { name: 'JSX <UserFormModal', regex: '<UserFormModal' },
  { name: 'usersApi', regex: 'usersApi' },
  { name: 'ConfirmDialog', regex: 'ConfirmDialog' },
];

console.log('── UsersPage.tsx ──\n');
for (const ch of checks) {
  const found = new RegExp(ch.regex, 'm').test(c);
  console.log((found ? '✅' : '❌') + ' ' + ch.name);
}

console.log('\nحجم فایل: ' + c.length + ' کاراکتر');
console.log('\n── ۱۵ خط اول ──');
const lines = c.split('\n');
lines.slice(0, 15).forEach((l, i) => console.log(String(i + 1).padStart(3) + '| ' + l));