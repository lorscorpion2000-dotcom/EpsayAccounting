import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';
const f = ROOT + '/frontend/src/modules/accounting/components/AccountFormModal.tsx';

if (!fs.existsSync(f)) { console.log('X فایل نیست'); process.exit(1); }
let c = fs.readFileSync(f, 'utf8');
let changed = false;

// 1) import entities fetch helpers
if (!c.includes("from '@/services/api'")) {
  c = c.replace(
    "import { accountingApi } from '../services/accounting.api';",
    "import { accountingApi } from '../services/accounting.api';\nimport { api } from '@/services/api';"
  );
  changed = true;
  console.log('OK import api');
}

// 2) state برای detail entities
if (!c.includes('detailOptions')) {
  const anchor = "const [saving, setSaving] = useState(false);";
  if (c.includes(anchor)) {
    c = c.replace(
      anchor,
      anchor + `
  const [detailOptions, setDetailOptions] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);`
    );
    changed = true;
    console.log('OK state detailOptions');
  }
}

// 3) useEffect بارگذاری بر اساس detailType
if (!c.includes('loadDetailOptions')) {
  const anchor = "const handleSubmit = async () => {";
  const newFn = `const loadDetailOptions = async (dt: string) => {
    setLoadingDetail(true);
    try {
      let items: any[] = [];
      if (dt === 'PARTNER') {
        const r = await api.get('/partners').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: p.name + (p.code ? ' (' + p.code + ')' : '') }));
      } else if (dt === 'ITEM') {
        const r = await api.get('/warehouse/items').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: p.name + (p.code ? ' (' + p.code + ')' : '') }));
      } else if (dt === 'PETTY_CASH') {
        const r = await api.get('/petty-cash/accounts').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: (p.name || '') + ' - ' + (p.holder?.fullName || p.employee?.fullName || '') }));
      }
      setDetailOptions(items);
    } finally { setLoadingDetail(false); }
  };

  useEffect(() => {
    if (form.detailType) loadDetailOptions(form.detailType);
    else setDetailOptions([]);
  }, [form.detailType]);

  ${anchor}`;
  
  if (c.includes(anchor)) {
    c = c.replace(anchor, newFn);
    changed = true;
    console.log('OK loadDetailOptions');
  }
}

// 4) form init — اضافه کردن detailType و detailId
if (!c.includes('detailType:')) {
  // reset default
  c = c.replace(
    /(setForm\(\{\s*code: '', name: '', level: 'GROUP', nature: 'DEBIT',)/,
    "$1\n        detailType: '', detailId: '',"
  );
  // editing
  c = c.replace(
    /(description: editing\.description \|\| '',)/,
    "$1\n        detailType: (editing as any).detailType || '',\n        detailId: (editing as any).detailId || '',"
  );
  changed = true;
  console.log('OK form fields');
}

// 5) payload — افزودن detailType/detailId
if (!c.includes('payload.detailType')) {
  c = c.replace(
    "if (form.parentId) payload.parentId = form.parentId;",
    `if (form.parentId) payload.parentId = form.parentId;
      if (form.level === 'TAFZIL') {
        if (form.detailType) payload.detailType = form.detailType;
        if (form.detailId) payload.detailId = form.detailId;
      }`
  );
  changed = true;
  console.log('OK payload');
}

// 6) dropdown level — افزودن TAFZIL
if (!c.includes('value="TAFZIL"')) {
  c = c.replace(
    '<option value="SUBSIDIARY">معین</option>',
    '<option value="SUBSIDIARY">معین</option>\n                <option value="TAFZIL">تفصیلی</option>'
  );
  changed = true;
  console.log('OK level option');
}

// 7) hint در Footer
if (!c.includes('تفصیلی برای اتصال')) {
  c = c.replace(
    /(\{form.level !== 'GROUP' && \()/,
    `{form.level === 'TAFZIL' && (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 mb-3">
                <b>تفصیلی</b> برای اتصال به یک entity خاص (شخص کالا تنخواه\u200Cگردان) استفاده می\u200Cشود.
              </div>
            )}

            $1`
  );
  changed = true;
}

// 8) dropdown detailType + detailId — قبل از description
if (!c.includes("register('detailType'")) {
  const anchor = `<div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>`;
  
  const newBlock = `{form.level === 'TAFZIL' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع تفصیلی *</label>
                  <select
                    value={form.detailType}
                    onChange={(e) => { set('detailType', e.target.value); set('detailId', ''); }}
                    className="input w-full"
                  >
                    <option value="">— انتخاب کنید —</option>
                    <option value="PARTNER">شخص (مشتری/تأمین\u200Cکننده/پرسنل)</option>
                    <option value="ITEM">کالا</option>
                    <option value="PETTY_CASH">تنخواه\u200Cگردان</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب {form.detailType === 'PARTNER' ? 'شخص' : form.detailType === 'ITEM' ? 'کالا' : form.detailType === 'PETTY_CASH' ? 'تنخواه\u200Cگردان' : 'مورد'} *</label>
                  <select
                    value={form.detailId}
                    onChange={(e) => set('detailId', e.target.value)}
                    className="input w-full"
                    disabled={!form.detailType || loadingDetail}
                  >
                    <option value="">{loadingDetail ? 'در حال بارگذاری...' : '— انتخاب کنید —'}</option>
                    {detailOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            ${anchor}`;
  
  if (c.includes(anchor)) {
    c = c.replace(anchor, newBlock);
    changed = true;
    console.log('OK detailType/detailId dropdowns');
  }
}

if (changed) {
  fs.writeFileSync(f, c, 'utf8');
  console.log('✅ AccountFormModal.tsx ذخیره شد');
}

console.log('');
console.log('=== DONE ===');