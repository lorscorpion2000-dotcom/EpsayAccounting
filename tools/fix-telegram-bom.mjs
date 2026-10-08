import fs from 'node:fs';

const file = 'E:\\EpsayAccounting\\tools\\telegram.config.json';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

fs.copyFileSync(file, `${file}.bak-${STAMP}`);
console.log(`✅ backup`);

let buf = fs.readFileSync(file);

console.log('اندازه فایل:', buf.length);

// حذف BOM اگه هست
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
  console.log('🔍 BOM پیدا شد (EF BB BF) — حذف شد');
  buf = buf.slice(3);
} else {
  console.log('ℹ️ BOM نبود');
}

const txt = buf.toString('utf8');

// اعتبارسنجی JSON
try {
  const obj = JSON.parse(txt);
  console.log('✅ JSON valid');
  console.log('  enabled:', obj.enabled);
  console.log('  token length:', obj.botToken.length);
  console.log('  chatId:', obj.chatId);
} catch (e) {
  console.log('❌ JSON invalid:', e.message);
  console.log('--- محتوا ---');
  console.log(txt);
  process.exit(1);
}

// ذخیره بدون BOM
fs.writeFileSync(file, txt, 'utf8');
console.log('✅ ذخیره بدون BOM');

// تأیید نهایی
const final = fs.readFileSync(file);
console.log('\n--- چک نهایی ---');
console.log('اولین ۳ بایت:', 
  final[0].toString(16).padStart(2, '0') + ' ' +
  final[1].toString(16).padStart(2, '0') + ' ' +
  final[2].toString(16).padStart(2, '0')
);
if (final[0] === 0x7B) console.log('✅ با { شروع می‌شه (JSON)');
else console.log('❌ هنوز BOM یا مشکل دیگه');