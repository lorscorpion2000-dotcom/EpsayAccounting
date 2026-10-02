import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/pages/LedgerPage.tsx';

let c = fs.readFileSync(f, 'utf8');
const lines = c.split('\n');

// پیدا کردن محدوده select (از خط حاوی `<select` تا `</select>`)
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (startIdx < 0 && lines[i].includes('<select') && lines[i].includes('value={selectedAccount}')) {
    startIdx = i;
  }
  if (startIdx >= 0 && lines[i].includes('</select>')) {
    endIdx = i;
    break;
  }
}

if (startIdx < 0 || endIdx < 0) {
  console.log('❌ select پیدا نشد');
  process.exit(1);
}

console.log('select از خط ' + (startIdx + 1) + ' تا ' + (endIdx + 1));

// نمایش select فعلی
console.log('\n── select فعلی ──');
for (let i = startIdx; i <= endIdx; i++) {
  console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
}

// پیدا کردن indent
const indentMatch = lines[startIdx].match(/^(\s*)/);
const indent = indentMatch ? indentMatch[1] : '              ';

// ساخت replacement
const newBlock = [
  indent + '<AccountSelect',
  indent + '  accounts={accounts}',
  indent + '  value={selectedAccount}',
  indent + '  onChange={setSelectedAccount}',
  indent + '  placeholder="جستجوی حساب..."',
  indent + '/>',
];

// جایگزینی
const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const newLines = [...before, ...newBlock, ...after];

fs.writeFileSync(f + '.bak-replace', c, 'utf8');
fs.writeFileSync(f, newLines.join('\n'), 'utf8');
console.log('\n✅ select با AccountSelect جایگزین شد');