import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/pages/LedgerPage.tsx';

let c = fs.readFileSync(f, 'utf8');
const lines = c.split('\n');

// پیدا کردن خطی که فقط `<select` دارد
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (startIdx < 0 && /^\s*<select\s*$/.test(lines[i])) {
    // چک کن که ۲ خط بعد value={selectedAccount} باشد
    if (i + 1 < lines.length && lines[i + 1].includes('selectedAccount')) {
      startIdx = i;
    }
  }
  if (startIdx >= 0 && lines[i].includes('</select>')) {
    endIdx = i;
    break;
  }
}

if (startIdx < 0 || endIdx < 0) {
  console.log('❌ select پیدا نشد');
  // نمایش ۳۰ خط اطراف selector
  console.log('\n── خطوط ۱۲۰-۱۵۰ ──');
  for (let i = 119; i < 150 && i < lines.length; i++) {
    console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
  }
  process.exit(1);
}

console.log('select از خط ' + (startIdx + 1) + ' تا ' + (endIdx + 1));

const indent = lines[startIdx].match(/^(\s*)/)[1];

const newBlock = [
  indent + '<AccountSelect',
  indent + '  accounts={accounts}',
  indent + '  value={selectedAccount}',
  indent + '  onChange={setSelectedAccount}',
  indent + '  placeholder="جستجوی حساب..."',
  indent + '/>',
];

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const newLines = [...before, ...newBlock, ...after];

fs.writeFileSync(f + '.bak-replace', c, 'utf8');
fs.writeFileSync(f, newLines.join('\n'), 'utf8');
console.log('✅ select با AccountSelect جایگزین شد');