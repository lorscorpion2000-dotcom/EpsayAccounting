// E:\EpsayAccounting\scripts\setup-contract-templates.mjs
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:/EpsayAccounting/backend';
const FRONTEND = 'E:/EpsayAccounting/frontend';
const TS = new Date().toISOString().replace(/[:.]/g, '-');

function backup(p) {
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, p + '.bak-' + TS);
    console.log('  💾 بکاپ: ' + path.basename(p + '.bak-' + TS));
  }
}

function write(rel, content, base = FRONTEND) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('  OK  ' + rel);
}

// ═══════════════════════════════════════════════════════════════
// 1) BACKEND — contracts.service.ts  (اضافه کردن متدهای template)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 1. Patch contracts.service.ts ===\n');
const svcPath = path.join(BACKEND, 'src/modules/contracts/contracts.service.ts');
let svc = fs.readFileSync(svcPath, 'utf8');

if (!svc.includes('async getTemplate')) {
  // اضافه کردن متدهای template قبل از آخرین }
  const templateMethods = `

  // ═══════════════════════════════════════════════════════════════
  // Contract Templates
  // ═══════════════════════════════════════════════════════════════

  async listTemplates() {
    return this.prisma.legalContractTemplate.findMany({
      orderBy: { kind: 'asc' },
    });
  }

  async getTemplate(kind: string) {
    return this.prisma.legalContractTemplate.findUnique({
      where: { kind: kind as any },
    });
  }

  async upsertTemplate(kind: string, title: string, bodyHtml: string) {
    return this.prisma.legalContractTemplate.upsert({
      where: { kind: kind as any },
      update: { title, bodyHtml },
      create: { kind: kind as any, title, bodyHtml },
    });
  }
}
`;
  // آخرین } را حذف و بلوک جدید را اضافه کن
  const lastBrace = svc.lastIndexOf('}');
  svc = svc.slice(0, lastBrace) + templateMethods;
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('  ✓ 3 متد به contracts.service.ts اضافه شد');
} else {
  console.log('  ℹ متدهای template از قبل موجود');
}

// ═══════════════════════════════════════════════════════════════
// 2) BACKEND — contracts.controller.ts (endpointهای template)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 2. Patch contracts.controller.ts ===\n');
const ctrlPath = path.join(BACKEND, 'src/modules/contracts/contracts.controller.ts');
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

if (!ctrl.includes("templates")) {
  // پیدا کردن آخرین } کلاس و اضافه کردن متدها
  const templateEndpoints = `

  // ═══════════════════════════════════════════════════════════════
  // Contract Templates
  // ═══════════════════════════════════════════════════════════════

  @Get('templates/list')
  listTemplates() {
    return this.svc.listTemplates();
  }

  @Get('templates/:kind')
  getTemplate(@Param('kind') kind: string) {
    return this.svc.getTemplate(kind);
  }

  @Patch('templates/:kind')
  upsertTemplate(
    @Param('kind') kind: string,
    @Body() body: { title: string; bodyHtml: string },
  ) {
    return this.svc.upsertTemplate(kind, body.title, body.bodyHtml);
  }
}
`;
  const lastBrace = ctrl.lastIndexOf('}');
  ctrl = ctrl.slice(0, lastBrace) + templateEndpoints;
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('  ✓ 3 endpoint جدید اضافه شد');
} else {
  console.log('  ℹ endpointهای template از قبل موجود');
}

// ═══════════════════════════════════════════════════════════════
// 3) FRONTEND — contracts.api.ts (اضافه کردن متدهای template)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 3. Patch contracts.api.ts ===\n');
const apiPath = path.join(FRONTEND, 'src/modules/contracts/services/contracts.api.ts');
backup(apiPath);
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('listTemplates')) {
  // اضافه کردن interface و توابع قبل از بسته شدن contractsApi
  const newInterface = `
export interface LegalContractTemplate {
  id: string;
  kind: LegalContractKind;
  title: string;
  bodyHtml: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
`;
  // بعد از LegalContract interface اضافه کن
  const insertPoint = api.indexOf('export const contractsApi = {');
  if (insertPoint > 0) {
    api = api.slice(0, insertPoint) + newInterface + '\n' + api.slice(insertPoint);
  }

  // اضافه کردن متدها به contractsApi
  const templatesMethods = `  // Templates
  listTemplates: () =>
    api.get<LegalContractTemplate[]>('/contracts/templates/list').then((r: any) => r.data),
  getTemplate: (kind: LegalContractKind) =>
    api.get<LegalContractTemplate | null>('/contracts/templates/' + kind).then((r: any) => r.data),
  upsertTemplate: (kind: LegalContractKind, data: { title: string; bodyHtml: string }) =>
    api.patch<LegalContractTemplate>('/contracts/templates/' + kind, data).then((r: any) => r.data),
`;
  // قبل از } آخر contractsApi
  const apiEnd = api.lastIndexOf('};');
  api = api.slice(0, apiEnd) + templatesMethods + api.slice(apiEnd);
  fs.writeFileSync(apiPath, api, 'utf8');
  console.log('  ✓ interface و متدهای template اضافه شد');
} else {
  console.log('  ℹ متدهای template از قبل موجود');
}

// ═══════════════════════════════════════════════════════════════
// 4) FRONTEND — ContractTemplatesPage.tsx
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 4. Create ContractTemplatesPage.tsx ===\n');

write('src/modules/contracts/pages/ContractTemplatesPage.tsx', `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, FileText, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { contractsApi, LegalContractKind } from '../services/contracts.api';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

export default function ContractTemplatesPage() {
  const [activeKind, setActiveKind] = useState<LegalContractKind>('WORKER_EMPLOYMENT');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async (kind: LegalContractKind) => {
    setLoading(true);
    try {
      const tpl = await contractsApi.getTemplate(kind);
      setTitle(tpl?.title || KIND_LABELS[kind]);
      setBodyHtml(tpl?.bodyHtml || '');
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(activeKind); }, [activeKind]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await contractsApi.upsertTemplate(activeKind, { title, bodyHtml });
      toast.success('ذخیره شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  const handleRefresh = () => load(activeKind);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            قالبهای قرارداد
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            متن آماده هر نوع قرارداد را اینجا یکبار ذخیره کنید — در فرم قرارداد جدید با یک کلیک قابل بارگذاری است
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.keys(KIND_LABELS) as LegalContractKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className={clsx(
              'py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium',
              activeKind === k
                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            )}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">عنوان قالب</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                متن قالب (HTML)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                میتوانید متن ساده بنویسید یا از تگهای HTML برای تیتر بولد و پاراگراف استفاده کنید
              </p>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={22}
                className="input w-full resize-none font-mono text-xs leading-6"
                placeholder="مثال:&#10;<h2>ماده ۱ - طرفین قرارداد</h2>&#10;<p>این قرارداد فیمابین ...</p>"
                dir="rtl"
              />
            </div>
            <div className="text-xs text-slate-500">
              طول متن: {bodyHtml.length.toLocaleString('fa-IR')} کاراکتر
            </div>
          </>
        )}
      </div>
    </div>
  );
}
`);

// ═══════════════════════════════════════════════════════════════
// 5) FRONTEND — Patch ContractFormModal (دکمه بارگذاری قالب)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 5. Patch ContractFormModal.tsx ===\n');
const formPath = path.join(FRONTEND, 'src/modules/contracts/components/ContractFormModal.tsx');
backup(formPath);
let form = fs.readFileSync(formPath, 'utf8');

// اضافه کردن state
if (!form.includes('loadingTemplate')) {
  form = form.replace(
    "const [showPartyModal, setShowPartyModal] = useState(false);",
    "const [showPartyModal, setShowPartyModal] = useState(false);\n  const [loadingTemplate, setLoadingTemplate] = useState(false);"
  );
}

// اضافه کردن تابع loadTemplate قبل از return
if (!form.includes('loadTemplate')) {
  form = form.replace(
    '  return (\n    <>',
    `  const loadTemplate = async () => {
    if (!form.kind) return;
    setLoadingTemplate(true);
    try {
      const tpl = await contractsApi.getTemplate(form.kind);
      if (!tpl || !tpl.bodyHtml) {
        toast.info('قالبی برای این نوع قرارداد ذخیره نشده');
        return;
      }
      set('bodyHtml', tpl.bodyHtml);
      toast.success('قالب بارگذاری شد');
    } catch { toast.error('خطا در بارگذاری قالب'); }
    finally { setLoadingTemplate(false); }
  };

  return (
    <>`
  );
}

// اضافه کردن دکمه بارگذاری قالب بالای textarea
if (!form.includes('loadTemplate()')) {
  form = form.replace(
    `<label className="block text-sm font-medium text-slate-700 mb-1">متن کامل قرارداد (HTML)</label>`,
    `<div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">متن کامل قرارداد (HTML)</label>
                  <button
                    type="button"
                    onClick={loadTemplate}
                    disabled={loadingTemplate}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                  >
                    {loadingTemplate ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    بارگذاری قالب
                  </button>
                </div>`
  );
}

// import Loader2 + FileText اگر نیست
if (!form.includes("Loader2")) {
  form = form.replace(
    /from 'lucide-react';/,
    "from 'lucide-react';"
  );
}

fs.writeFileSync(formPath, form, 'utf8');
console.log('  ✓ دکمه بارگذاری قالب اضافه شد');

// ═══════════════════════════════════════════════════════════════
// 6) FRONTEND — router.tsx (اضافه کردن روت)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 6. Patch router.tsx ===\n');
const routerPath = path.join(FRONTEND, 'src/app/router.tsx');
backup(routerPath);
let router = fs.readFileSync(routerPath, 'utf8');

if (!router.includes('ContractTemplatesPage')) {
  // import
  router = router.replace(
    "import ContractViewPage from '@/modules/contracts/pages/ContractViewPage';",
    "import ContractViewPage from '@/modules/contracts/pages/ContractViewPage';\nimport ContractTemplatesPage from '@/modules/contracts/pages/ContractTemplatesPage';"
  );
  // route
  router = router.replace(
    '<Route path="/contracts/:id" element={<ContractViewPage />} />',
    '<Route path="/contracts/:id" element={<ContractViewPage />} />\n        <Route path="/contracts/templates" element={<ContractTemplatesPage />} />'
  );
  fs.writeFileSync(routerPath, router, 'utf8');
  console.log('  ✓ روت اضافه شد');
} else {
  console.log('  ℹ از قبل موجود');
}

// ═══════════════════════════════════════════════════════════════
// 7) FRONTEND — MainLayout.tsx (آیتم سایدبار)
// ═══════════════════════════════════════════════════════════════
console.log('\n=== 7. Patch MainLayout.tsx ===\n');
const layoutPath = path.join(FRONTEND, 'src/layouts/MainLayout.tsx');
backup(layoutPath);
let layout = fs.readFileSync(layoutPath, 'utf8');

if (!layout.includes("'/contracts/templates'")) {
  layout = layout.replace(
    "{ to: '/contracts', label: 'همه قراردادها', icon: FileText },",
    "{ to: '/contracts', label: 'همه قراردادها', icon: FileText },\n      { to: '/contracts/templates', label: 'قالبهای قرارداد', icon: FileImage },"
  );
  fs.writeFileSync(layoutPath, layout, 'utf8');
  console.log('  ✓ آیتم سایدبار اضافه شد');
} else {
  console.log('  ℹ از قبل موجود');
}

console.log('\n════════════════════════════════════════════════');
console.log('  ✅ Contract Templates Setup Complete!');
console.log('════════════════════════════════════════════════');
console.log('');
console.log('Next steps:');
console.log('  1. cd E:\\EpsayAccounting\\backend');
console.log('  2. npm run build');
console.log('  3. cd ..\\frontend');
console.log('  4. npm run build');
console.log('  5. سرورها را ریاستارت کنید');
console.log('  6. باز کن: /contracts/templates');
console.log('');