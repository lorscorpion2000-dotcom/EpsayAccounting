import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const dtoPath = ROOT + '/backend/src/modules/procurement/dto/create-po.dto.ts';
let dto = fs.readFileSync(dtoPath, 'utf8');
let changed = 0;

// رفع دوتا کولون
if (dto.includes('supplierId?:: string;')) {
  dto = dto.replace(/supplierId\?::\s*string;/g, 'supplierId?: string;');
  changed++;
  console.log('✅ دوتا کولون رفع شد');
}

if (dto.includes('supplierId?:: ')) {
  dto = dto.replace(/supplierId\?::\s*/g, 'supplierId?: ');
  changed++;
}

// بررسی مجدد
if (!changed && !dto.includes('supplierId?: string;')) {
  // اگر هنوز تکراری یا مشکلدار است بازنویسی کن
  const lines = dto.split('\n');
  const fixed = lines.map((l) => {
    if (/supplierId/.test(l)) {
      return l.replace(/supplierId\??::\s*string;?/, 'supplierId?: string;');
    }
    return l;
  });
  dto = fixed.join('\n');
  changed++;
  console.log('✅ بازنویسی خط-by-خط');
}

if (changed) {
  fs.writeFileSync(dtoPath, dto, 'utf8');
  console.log('✅ create-po.dto.ts ذخیره شد');
}

// نمایش خطوط مرتبط
console.log('');
console.log('── خطوط supplierId ──');
dto.split('\n').forEach((l, i) => {
  if (l.includes('supplierId')) {
    console.log('L' + (i + 1) + ': ' + l.trim());
  }
});