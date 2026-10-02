import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

function checkFile(name, path, patterns) {
  console.log('\n═══ ' + name + ' ═══');
  if (!fs.existsSync(path)) {
    console.log('❌ فایل وجود ندارد: ' + path);
    return;
  }
  const c = fs.readFileSync(path, 'utf8');
  console.log('حجم: ' + c.length + ' chars');
  for (const p of patterns) {
    const found = new RegExp(p.regex, 'm').test(c);
    console.log((found ? '✅' : '❌') + ' ' + p.name);
  }
  return c;
}

// 1) UserFormModal
checkFile(
  'UserFormModal',
  ROOT + '/frontend/src/modules/settings/components/UserFormModal.tsx',
  [
    { name: 'export default', regex: 'export default' },
    { name: 'isOpen check', regex: 'if \\(!isOpen\\) return null' },
    { name: 'onSubmit', regex: 'onSubmit' },
    { name: 'usersApi.create', regex: 'usersApi\\.create' },
    { name: 'roles fetch', regex: 'usersApi\\.roles' },
  ]
);

// 2) users.api
checkFile(
  'users.api.ts',
  ROOT + '/frontend/src/modules/settings/services/users.api.ts',
  [
    { name: 'usersApi', regex: 'export const usersApi' },
    { name: 'list method', regex: 'list:' },
    { name: 'create method', regex: 'create:' },
    { name: 'roles method', regex: 'roles:' },
  ]
);

// 3) ProfilePage
checkFile(
  'ProfilePage',
  ROOT + '/frontend/src/modules/settings/pages/ProfilePage.tsx',
  [
    { name: 'export default', regex: 'export default' },
    { name: 'profileApi', regex: 'profileApi' },
  ]
);

// 4) auth.api — profileApi
checkFile(
  'auth.api.ts',
  ROOT + '/frontend/src/modules/auth/services/auth.api.ts',
  [
    { name: 'profileApi', regex: 'profileApi' },
    { name: 'changePassword', regex: 'changePassword' },
  ]
);