import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const svcPath = ROOT + '/backend/src/modules/accounting/accounts.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
let changed = 0;

// الگو: دو بار detailType + detailId تکرار شده در create
const dupPattern = /(detailType:\s*\(dto as any\)\.detailType[^\n]*\n\s*detailId:\s*\(dto as any\)\.detailId[^\n]*\n)\s*(detailType:\s*\(dto as any\)\.detailType[^\n]*\n\s*detailId:\s*\(dto as any\)\.detailId[^\n]*\n)/;

if (dupPattern.test(svc)) {
  svc = svc.replace(dupPattern, '$1');
  changed++;
  console.log('✅ duplicate create حذف شد');
}

// همین برای update
const dupUpdate = /((?:\s*if\s*\(\(dto as any\)\.detailType[^\n]*\n\s*if\s*\(\(dto as any\)\.detailId[^\n]*\n))(?:\s*if\s*\(\(dto as any\)\.detailType[^\n]*\n\s*if\s*\(\(dto as any\)\.detailId[^\n]*\n))/;
if (dupUpdate.test(svc)) {
  svc = svc.replace(dupUpdate, '$1');
  changed++;
  console.log('✅ duplicate update حذف شد');
}

if (changed > 0) {
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('✅ ذخیره شد (' + changed + ' تغییر)');
} else {
  // روش خط-به-خط — حذف خطوط تکراری
  const lines = svc.split('\n');
  const out = [];
  let lastDetailTypeLine = -10;
  let lastDetailIdLine = -10;
  let removed = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const isDetailType = /detailType:\s*\(dto as any\)\.detailType/.test(l) && !l.includes('!==');
    const isDetailId = /detailId:\s*\(dto as any\)\.detailId/.test(l) && !l.includes('!==');
    
    if (isDetailType) {
      if (i - lastDetailTypeLine < 3) {
        removed++;
        console.log('حذف تکراری L' + (i + 1));
        continue;
      }
      lastDetailTypeLine = i;
    }
    if (isDetailId) {
      if (i - lastDetailIdLine < 3) {
        removed++;
        console.log('حذف تکراری L' + (i + 1));
        continue;
      }
      lastDetailIdLine = i;
    }
    out.push(l);
  }
  
  if (removed > 0) {
    fs.writeFileSync(svcPath, out.join('\n'), 'utf8');
    console.log('✅ ' + removed + ' خط تکراری حذف شد');
  } else {
    console.log('ℹ خط تکراری پیدا نشد — نمایش خطوط ۸۰-۹۵:');
    for (let i = 79; i < 95 && i < lines.length; i++) {
      console.log(String(i + 1).padStart(3) + '| ' + lines[i]);
    }
  }
}