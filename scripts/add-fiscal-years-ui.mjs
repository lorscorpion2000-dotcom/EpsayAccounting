import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════ 1) صفحه FiscalYearsPage.tsx ═══════════
const pageContent = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Loader2, Edit, Trash2, Calendar, RefreshCw, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '@/modules/accounting/services/accounting.api';
import type { FiscalYear } from '@/types/accounting';
import { formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import FiscalYearFormModal from '../components/FiscalYearFormModal';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'باز',
  CLOSED: 'بسته',
  LOCKED: 'قفل‌شده',
};

export default function FiscalYearsPage() {
  const [items, setItems] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FiscalYear | null>(null);
  const [deleting, setDeleting] = useState<FiscalYear | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await accountingApi.fiscalYears.list());
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSetCurrent = async (fy: FiscalYear) => {
    try {
      await accountingApi.fiscalYears.setCurrent(fy.id);
      toast.success('سال مالی جاری تغییر کرد');
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            سال‌های مالی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت سال‌های مالی و تعیین سال جاری برای ثبت اسناد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> سال مالی جدید
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ سال مالی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> ایجاد اولین سال مالی
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">شروع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">پایان</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">جاری</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((fy) => (
                  <tr key={fy.id} className={clsx('hover:bg-slate-50/50', fy.isCurrent && 'bg-emerald-50/40')}>
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{fy.code}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-800">{fy.name}</td>
                    <td className="px-4 py-3 num text-xs">{formatJalaliDate(fy.startDate)}</td>
                    <td className="px-4 py-3 num text-xs">{formatJalaliDate(fy.endDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-md',
                        fy.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      )}>
                        {STATUS_LABELS[fy.status] || fy.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {fy.isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> جاری
                        </span>
                      ) : fy.status === 'OPEN' ? (
                        <button
                          onClick={() => handleSetCurrent(fy)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          تعیین جاری
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditing(fy); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(fy)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <FiscalYearFormModal
        isOpen={showModal}
        editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="حذف سال مالی"
        message={'آیا از حذف «' + (deleting?.name || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
`;

fs.mkdirSync(ROOT + '/frontend/src/modules/settings/pages', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/settings/pages/FiscalYearsPage.tsx', pageContent, 'utf8');
console.log('OK FiscalYearsPage.tsx');

// ═══════════ 2) FiscalYearFormModal.tsx ═══════════
const modalContent = `import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Save } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { accountingApi } from '@/modules/accounting/services/accounting.api';
import type { FiscalYear } from '@/types/accounting';
import { PersianDatePicker } from '@/components/PersianDatePicker';

interface Props {
  isOpen: boolean;
  editing?: FiscalYear | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function FiscalYearFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { isCurrent: false },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      reset({
        code: editing.code,
        name: editing.name,
        startDate: editing.startDate.slice(0, 10),
        endDate: editing.endDate.slice(0, 10),
        isCurrent: editing.isCurrent,
      });
    } else {
      reset({ code: '', name: '', startDate: '', endDate: '', isCurrent: false });
    }
  }, [isOpen, editing, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editing) {
        await accountingApi.fiscalYears.update(editing.id, data);
        toast.success('ویرایش شد');
      } else {
        await accountingApi.fiscalYears.create(data);
        toast.success('ایجاد شد');
      }
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش سال مالی' : 'سال مالی جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد *</label>
              <input
                {...register('code', { required: 'کد الزامی است' })}
                className="input w-full num"
                dir="ltr"
                placeholder="1405"
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام *</label>
              <input
                {...register('name', { required: 'نام الزامی است' })}
                className="input w-full"
                placeholder="سال مالی ۱۴۰۵"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ شروع *</label>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'تاریخ شروع الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاریخ پایان *</label>
              <Controller
                name="endDate"
                control={control}
                rules={{ required: 'تاریخ پایان الزامی است' }}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
            </div>
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('isCurrent')} id="isCurrent" className="w-4 h-4" />
              <label htmlFor="isCurrent" className="text-sm text-slate-700 cursor-pointer">
                این سال به‌عنوان سال مالی جاری انتخاب شود
              </label>
            </div>
          )}
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

fs.mkdirSync(ROOT + '/frontend/src/modules/settings/components', { recursive: true });
fs.writeFileSync(ROOT + '/frontend/src/modules/settings/components/FiscalYearFormModal.tsx', modalContent, 'utf8');
console.log('OK FiscalYearFormModal.tsx');

// ═══════════ 3) Router ═══════════
const routerPath = ROOT + '/frontend/src/app/router.tsx';
let router = fs.readFileSync(routerPath, 'utf8');

if (!router.includes('FiscalYearsPage')) {
  // import
  router = router.replace(
    "import RolesPage from '@/modules/settings/pages/RolesPage';",
    "import RolesPage from '@/modules/settings/pages/RolesPage';\nimport FiscalYearsPage from '@/modules/settings/pages/FiscalYearsPage';"
  );
  // route
  router = router.replace(
    '<Route path="/settings/roles" element={<RolesPage />} />',
    '<Route path="/settings/roles" element={<RolesPage />} />\n        <Route path="/settings/fiscal-years" element={<FiscalYearsPage />} />'
  );
  fs.writeFileSync(routerPath, router, 'utf8');
  console.log('OK router.tsx');
} else {
  console.log('SKIP router');
}

// ═══════════ 4) Sidebar ═══════════
const layoutPath = ROOT + '/frontend/src/layouts/MainLayout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

if (!layout.includes("'/settings/fiscal-years'")) {
  layout = layout.replace(
    "{ to: '/settings/roles', label: 'نقش‌ها و مجوزها', icon: Shield },",
    "{ to: '/settings/roles', label: 'نقش‌ها و مجوزها', icon: Shield },\n      { to: '/settings/fiscal-years', label: 'سال‌های مالی', icon: Calendar },"
  );
  fs.writeFileSync(layoutPath, layout, 'utf8');
  console.log('OK MainLayout.tsx');
} else {
  console.log('SKIP sidebar');
}

console.log('');
console.log('=== DONE ===');