import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/components/AccountFormModal.tsx';
let c = fs.readFileSync(f, 'utf8');
let changed = 0;

// 1) پیدا کردن بلوک useEffect فعلی (loadDetailOptions)
const effectRegex = /(\s*useEffect\(\(\)\s*=>\s*\{\s*\r?\n\s*if\s*\(form\.detailType\)\s*loadDetailOptions[\s\S]*?\},\s*\[form\.detailType\]\);\s*\r?\n)/;

const match = c.match(effectRegex);
if (!match) {
  console.log('❌ useEffect پیدا نشد — نمایش خطوط ۱۱۰-۱۴۰');
  const lines = c.split('\n');
  for (let i = 109; i < 140 && i < lines.length; i++) {
    console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
  }
  process.exit(1);
}

// 2) حذف useEffect از محل فعلی
const blockToMove = match[1];
c = c.replace(blockToMove, '\n');
console.log('✅ useEffect حذف شد از محل فعلی');

// 3) پیدا کردن `if (!isOpen) return null;` برای درج قبل از آن
const returnNullMatch = c.match(/(\s*if\s*\(!isOpen\)\s*return\s+null;)/);

if (!returnNullMatch) {
  console.log('❌ `if (!isOpen) return null` پیدا نشد');
  process.exit(1);
}

// 4) درج useEffect قبل از `if (!isOpen) return null;`
c = c.replace(
  returnNullMatch[1],
  blockToMove + returnNullMatch[1]
);

changed++;
console.log('✅ useEffect به قبل از return null منتقل شد');

fs.writeFileSync(f, c, 'utf8');
console.log('✅ ذخیره شد');

// تأیید
console.log('');
console.log('── ترتیب hook ها ──');
const lines = c.split('\n');
let hookOrder = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/useEffect|useState|useForm|useRef/.test(l) && !/import/.test(l)) {
    if (/if \(!isOpen\) return null/.test(l)) {
      console.log('   ⚠ return null در خط ' + (i + 1));
    }
    if (/useState|useEffect/.test(l)) {
      console.log('   L' + (i + 1) + ': ' + l.trim().substring(0, 70));
    }
  }
  if (/if \(!isOpen\) return null/.test(l)) {
    console.log('   >>> EARLY RETURN در خط ' + (i + 1));
  }
}