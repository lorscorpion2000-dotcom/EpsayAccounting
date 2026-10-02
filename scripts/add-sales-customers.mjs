import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════ 1) SalesCustomersPage ═══════════
const page = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Users, Edit, Trash2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { styleWorksheet, makeWorkbook } from '@/utils/excel-style';
import { salesApi, SalesCustomer } from '../services/sales.api';
import CustomerFormModal from '../components/CustomerFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function SalesCustomersPage() {
  const [items, setItems] = useState<SalesCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesCustomer | null>(null);
  const [deleting, setDeleting] = useState<SalesCustomer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await salesApi.customers.list(search || undefined)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      // حذف مشتری معمولاً فقط غیرفعال کردن است — ولی اینجا حذف می‌کنیم
      // اگر قرارداد داشته باشد، بک‌اند خطا می‌دهد
      await (salesApi.customers as any).remove?.(deleting.id) || toast.info('حذف مشتری فعلاً از API پشتیبانی نمی‌شود');
      setDeleting(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => ({
      'ردیف': i + 1,
      'نام': c.fullName,
      'کد ملی': c.nationalId || '',
      'موبایل': c.mobilePhone || '',
      'تلفن ثابت': c.landlinePhone || '',
      'ایمیل': c.email || '',
      'شبا': c.bankSheba || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    styleWorksheet(ws, rows);
    const wb = makeWorkbook();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'SalesCustomers-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            مشتریان فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت اطلاعات خریداران واحدها</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> مشتری جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="جستجو بر اساس نام، کد ملی یا موبایل..."
            className="input ps-10 pe-4 w-full"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ مشتری ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین مشتری
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام کامل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد ملی</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">موبایل</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">آدرس</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.fullName}</td>
                    <td className="px-4 py-3"><span className="num text-xs" dir="ltr">{c.nationalId || '—'}</span></td>
                    <td className="px-4 py-3"><span className="num text-xs" dir="ltr">{c.mobilePhone || '—'}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-xs">{c.address || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(c); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />
    </div>
  );
}
`;

fs.mkdirSync(ROOT + '/frontend/src/modules/sales/pages', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/sales/pages/SalesCustomersPage.tsx', page, 'utf8');
console.log('OK SalesCustomersPage.tsx');

// ═══════════ 2) CustomerFormModal ═══════════
const modal = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { salesApi, SalesCustomer } from '../services/sales.api';

interface Props {
  isOpen: boolean;
  editing?: SalesCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        fullName: editing.fullName,
        nationalId: editing.nationalId || '',
        mobilePhone: editing.mobilePhone || '',
        landlinePhone: editing.landlinePhone || '',
        email: editing.email || '',
        address: editing.address || '',
        postalCode: editing.postalCode || '',
        bankSheba: editing.bankSheba || '',
        notes: editing.notes || '',
      });
    } else {
      reset({ fullName: '', nationalId: '', mobilePhone: '', landlinePhone: '', email: '', address: '', postalCode: '', bankSheba: '', notes: '' });
    }
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const payload: any = { ...data };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      if (editing) await salesApi.customers.update(editing.id, payload);
      else await salesApi.customers.create(payload);
      toast.success(editing ? 'ویرایش شد' : 'مشتری جدید ساخته شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش مشتری' : 'مشتری جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل *</label>
              <input {...register('fullName', { required: 'نام الزامی است' })} className="input w-full" />
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{(errors.fullName as any).message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد ملی</label>
              <input {...register('nationalId')} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">موبایل</label>
              <input {...register('mobilePhone')} className="input w-full num" dir="ltr" placeholder="09..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تلفن ثابت</label>
              <input {...register('landlinePhone')} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ایمیل</label>
              <input {...register('email')} className="input w-full num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
              <textarea {...register('address')} rows={2} className="input w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد پستی</label>
              <input {...register('postalCode')} className="input w-full num" dir="ltr" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شبا</label>
              <input {...register('bankSheba')} className="input w-full num" dir="ltr" placeholder="IR..." maxLength={26} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea {...register('notes')} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.mkdirSync(ROOT + '/frontend/src/modules/sales/components', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/sales/components/CustomerFormModal.tsx', modal, 'utf8');
console.log('OK CustomerFormModal.tsx');

// ═══════════ 3) Router ═══════════
const routerPath = ROOT + '/frontend/src/app/router.tsx';
let router = fs.readFileSync(routerPath, 'utf8');

if (!router.includes('SalesCustomersPage')) {
  router = router.replace(
    "import SalesUnitsPage from '@/modules/sales/pages/SalesUnitsPage';",
    "import SalesUnitsPage from '@/modules/sales/pages/SalesUnitsPage';\nimport SalesCustomersPage from '@/modules/sales/pages/SalesCustomersPage';"
  );
  router = router.replace(
    '<Route path="/sales/units" element={<SalesUnitsPage />} />',
    '<Route path="/sales/units" element={<SalesUnitsPage />} />\n        <Route path="/sales/customers" element={<SalesCustomersPage />} />'
  );
  fs.writeFileSync(routerPath, router, 'utf8');
  console.log('OK router');
} else {
  console.log('SKIP router');
}

// ═══════════ 4) Sidebar ═══════════
const layoutPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

if (!layout.includes("'/sales/customers'")) {
  layout = layout.replace(
    "{ to: '/sales/units',     label: 'واحدهای قابل فروش', icon: Building2 },",
    "{ to: '/sales/units',     label: 'واحدهای قابل فروش', icon: Building2 },\n      { to: '/sales/customers', label: 'مشتریان فروش',      icon: UsersIcon },"
  );
  fs.writeFileSync(layoutPath, layout, 'utf8');
  console.log('OK sidebar');
} else {
  console.log('SKIP sidebar');
}

console.log('');
console.log('=== DONE ===');