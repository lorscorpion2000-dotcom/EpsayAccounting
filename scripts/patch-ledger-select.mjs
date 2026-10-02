import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/pages/LedgerPage.tsx';
let c = fs.readFileSync(f, 'utf8');
let changed = 0;

// بکاپ اول
fs.writeFileSync(f + '.bak-ledger', c, 'utf8');
console.log('✅ بکاپ ساخته شد');

// 1) import
if (!c.includes('AccountSelect')) {
  // پیدا کردن آخرین import قبل از interface یا export
  const match = c.match(/(import[\s\S]*?from\s+['"][^'"]+['"];?\s*\n)(\s*\n)(interface|type|export default|const\s)/);
  if (match) {
    c = c.replace(
      match[0],
      match[1] + "import AccountSelect from '../components/AccountSelect';\n" + match[2] + match[3]
    );
    changed++;
    console.log('OK import');
  } else {
    // روش ساده‌تر
    c = c.replace(
      "import { accountingApi } from '../services/accounting.api';",
      "import { accountingApi } from '../services/accounting.api';\nimport AccountSelect from '../components/AccountSelect';"
    );
    changed++;
    console.log('OK import (simple)');
  }
}

// 2) پیدا کردن select حساب
const selectRegex = /<select[\s\S]{0,800}?accountId[\s\S]{0,1500}?<\/select>/;
const selectMatch = c.match(selectRegex);

if (selectMatch) {
  console.log('select قدیمی پیدا شد، طول: ' + selectMatch[0].length);
  
  // نگه داشتن value و onChange
  const valueMatch = selectMatch[0].match(/value=\{([^}]+)\}/);
  const onChangeMatch = selectMatch[0].match(/onChange=\{([^}]+)\}/);
  
  let valueExpr = valueMatch ? valueMatch[1] : 'accountId';
  let onChangeExpr = onChangeMatch ? onChangeMatch[1] : '(v) => setAccountId(v)';
  
  const replacement = `<AccountSelect
                      accounts={accounts}
                      value={${valueExpr} || ''}
                      onChange={${onChangeExpr}}
                      placeholder="جستجوی حساب..."
                      loading={loadingAccounts}
                    />`;
  
  c = c.replace(selectMatch[0], replacement);
  changed++;
  console.log('OK جایگزینی select');
} else {
  console.log('!! select پیدا نشد — نمایش خطوط مرتبط:');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (/select|accountId|<option/.test(l)) {
      console.log('  L' + (i + 1) + ': ' + l.trim().substring(0, 100));
    }
  });
}

if (changed > 0) {
  fs.writeFileSync(f, c, 'utf8');
  console.log('✅ LedgerPage.tsx ذخیره شد (' + changed + ' تغییر)');
}