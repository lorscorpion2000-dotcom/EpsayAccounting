import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/components/AccountFormModal.tsx';

if (!fs.existsSync(f)) { console.log('X'); process.exit(1); }
let c = fs.readFileSync(f, 'utf8');
let changed = 0;

// 1) چک و نمایش anchors
console.log('── چک فعلی ──');
const checks = [
  { name: 'TAFZIL option', found: c.includes('value="TAFZIL"') },
  { name: 'detailType in setForm (new)', found: /setForm\(\{[\s\S]*?detailType:/.test(c) },
  { name: 'detailType in editing', found: /editing[\s\S]{0,100}detailType/.test(c) },
  { name: 'detailType in payload', found: c.includes('payload.detailType') },
  { name: 'hint TAFZIL', found: c.includes('برای اتصال به یک') },
];
checks.forEach((ch) => console.log((ch.found ? '✅' : '❌') + ' ' + ch.name));

// 2) اضافه کردن TAFZIL به dropdown سطح
if (!c.includes('value="TAFZIL"')) {
  const anchors = [
    '<option value="SUBSIDIARY">معین</option>',
    '<option value="SUBSIDIARY">معن</option>',
    '<option value="SUBSIDIARY">',
  ];
  for (const a of anchors) {
    if (c.includes(a)) {
      c = c.replace(
        a,
        a + '\n                <option value="TAFZIL">تفصیلی</option>'
      );
      changed++;
      console.log('✅ TAFZIL option اضافه شد');
      break;
    }
  }
}

// 3) reset form: افزودن detailType/detailId در setForm خالی
if (!/setForm\(\{[\s\S]{0,200}?detailType:/.test(c)) {
  // پیدا کردن بلوک: setForm({ code: '', name: '', ...
  const match = c.match(/setForm\(\{[\s\S]*?description:\s*''/);
  if (match) {
    c = c.replace(
      match[0],
      match[0] + ",\n        detailType: '',\n        detailId: ''"
    );
    changed++;
    console.log('✅ reset form — detailType/detailId');
  } else {
    console.log('!! reset form anchor نبود');
  }
}

// 4) editing form: افزودن detailType/detailId
if (!/description:\s*editing\.description[\s\S]{0,100}?detailType/.test(c)) {
  const match = c.match(/description:\s*editing\.description\s*\|\|\s*''/);
  if (match) {
    c = c.replace(
      match[0],
      match[0] + ",\n        detailType: (editing as any).detailType || '',\n        detailId: (editing as any).detailId || ''"
    );
    changed++;
    console.log('✅ editing form — detailType/detailId');
  } else {
    console.log('!! editing form anchor نبود');
  }
}

// 5) payload: افزودن detailType/detailId
if (!c.includes('payload.detailType')) {
  const match = c.match(/if\s*\(form\.parentId\)\s*payload\.parentId\s*=\s*form\.parentId;/);
  if (match) {
    c = c.replace(
      match[0],
      match[0] + `
      if (form.level === 'TAFZIL') {
        if (form.detailType) payload.detailType = form.detailType;
        if (form.detailId) payload.detailId = form.detailId;
      }`
    );
    changed++;
    console.log('✅ payload — detailType/detailId');
  } else {
    console.log('!! payload anchor نبود');
  }
}

// 6) hint تفصیلی
if (!c.includes('برای اتصال به یک')) {
  // قبل از <div className="md:col-span-2">توضیحات
  const match = c.match(/(<label className="block[^"]*">توضیحات<\/label>)/);
  if (match) {
    c = c.replace(
      match[0],
      `{form.level === 'TAFZIL' && (
              <div className="md:col-span-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                <b>تفصیلی</b> برای اتصال به یک entity خاص (شخص کالا تنخواهگردان) استفاده میشود.
              </div>
            )}
            ${match[0]}`
    );
    changed++;
    console.log('✅ hint TAFZIL');
  }
}

if (changed > 0) {
  fs.writeFileSync(f, c, 'utf8');
  console.log('\n✅ ذخیره شد (' + changed + ' تغییر)');
} else {
  console.log('\nℹ همه از قبل موجود');
}