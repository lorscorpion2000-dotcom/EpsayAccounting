import { useEffect, useState } from 'react';

import { toast } from 'sonner';
import {
  Lock as LockIcon, Unlock as UnlockIcon, FileMinus, FilePlus,
  Plus, Loader2, Edit, Archive, Calendar, RefreshCw, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { accountingApi } from '@/modules/accounting/services/accounting.api';
import type { FiscalYear } from '@/types/accounting';
import { formatJalaliDate } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import FiscalYearFormModal from '../components/FiscalYearFormModal';
import AdminDeleteButton from '@/components/AdminDeleteButton';

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
  const [closing, setClosing] = useState<FiscalYear | null>(null);
  const [reopening, setReopening] = useState<FiscalYear | null>(null);
  const [generatingClosing, setGeneratingClosing] = useState<FiscalYear | null>(null);
  const [generatingOpening, setGeneratingOpening] = useState<FiscalYear | null>(null);
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
      toast.success('سال مالی جاری تغییر یافت');
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
      toast.success('به سطل بازیافت منتقل شد');
      setDeleting(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    if (!closing) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.close(closing.id);
      toast.success('سال مالی بسته شد');
      setClosing(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleReopen = async () => {
    if (!reopening) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.reopen(reopening.id);
      toast.success('سال مالی دوباره باز شد');
      setReopening(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleGenerateClosing = async () => {
    if (!generatingClosing) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.generateClosing(generatingClosing.id);
      toast.success('سند اختتامیه ساخته شد');
      setGeneratingClosing(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در تولید سند اختتامیه');
    } finally { setActionLoading(false); }
  };

  const handleGenerateOpening = async () => {
    if (!generatingOpening) return;
    setActionLoading(true);
    try {
      await accountingApi.fiscalYears.generateOpening(generatingOpening.id);
      toast.success('سند افتتاحیه ساخته شد');
      setGeneratingOpening(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در تولید سند افتتاحیه');
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
            مدیریت سال‌های مالی — سال جاری مبنای ثبت اسناد است
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
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-40">عملیات</th>
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
                          تغییر جاری
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* تولید سند اختتامیه */}
                        <button
                          onClick={() => setGeneratingClosing(fy)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600"
                          title="تولید سند اختتامیه"
                        >
                          <FileMinus className="w-4 h-4" />
                        </button>

                        {/* تولید سند افتتاحیه */}
                        <button
                          onClick={() => setGeneratingOpening(fy)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-cyan-600"
                          title="تولید سند افتتاحیه"
                        >
                          <FilePlus className="w-4 h-4" />
                        </button>

                        {/* ویرایش */}
                        <button
                          onClick={() => { setEditing(fy); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* بستن سال مالی */}
                        {fy.status === 'OPEN' && !fy.isCurrent && (
                          <button
                            onClick={() => setClosing(fy)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"
                            title="بستن سال مالی"
                          >
                            <LockIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* بازگشایی سال مالی */}
                        {fy.status === 'CLOSED' && (
                          <button
                            onClick={() => setReopening(fy)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            title="بازگشایی سال مالی"
                          >
                            <UnlockIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* حذف (soft) */}
                        <button
                          onClick={() => setDeleting(fy)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="انتقال به سطل بازیافت"
                        >
                          <Archive className="w-4 h-4" />
                        </button>

                        {/* حذف دائمی (admin) */}
                        <AdminDeleteButton
                          endpoint="/fiscal-years"
                          id={fy.id}
                          itemLabel={(fy as any).code || (fy as any).name || ''}
                          onSuccess={load}
                        />
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
        isOpen={!!closing}
        title="بستن سال مالی"
        message={'آیا از بستن سال مالی «' + (closing?.name || '') + '» مطمئن هستید؟ پس از بستن، اسناد جدید در این سال ثبت نمی‌شوند.'}
        confirmLabel="بله، بستن"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleClose}
        onCancel={() => setClosing(null)}
      />

      <ConfirmDialog
        isOpen={!!reopening}
        title="بازگشایی سال مالی"
        message={'آیا از بازگشایی سال مالی «' + (reopening?.name || '') + '» مطمئن هستید؟'}
        confirmLabel="بله، باز کن"
        variant="info"
        loading={actionLoading}
        onConfirm={handleReopen}
        onCancel={() => setReopening(null)}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        title="انتقال به سطل بازیافت"
        message={'آیا از انتقال سال مالی «' + (deleting?.name || '') + '» به سطل بازیافت مطمئن هستید؟ (قابل بازیابی)'}
        confirmLabel="بله، انتقال بده"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        isOpen={!!generatingClosing}
        title="تولید سند اختتامیه"
        message={'آیا از تولید سند اختتامیه برای سال مالی «' + (generatingClosing?.name || '') + '» مطمئن هستید؟ این عمل حساب‌های موقت (درآمد و هزینه) را می‌بندد.'}
        confirmLabel="بله، تولید کن"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleGenerateClosing}
        onCancel={() => setGeneratingClosing(null)}
      />

      <ConfirmDialog
        isOpen={!!generatingOpening}
        title="تولید سند افتتاحیه"
        message={'آیا از تولید سند افتتاحیه برای سال مالی «' + (generatingOpening?.name || '') + '» مطمئن هستید؟ ماندهای دائمی از سال قبل منتقل می‌شود.'}
        confirmLabel="بله، تولید کن"
        variant="info"
        loading={actionLoading}
        onConfirm={handleGenerateOpening}
        onCancel={() => setGeneratingOpening(null)}
      />
    </div>
  );
}
