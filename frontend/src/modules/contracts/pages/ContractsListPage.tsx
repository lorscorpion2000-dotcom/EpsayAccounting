import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, FileText, Edit, Ban, RefreshCw, Printer, FileSpreadsheet, CheckCircle2, Play, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { contractsApi, LegalContract, LegalContractKind, LegalContractStatus } from '../services/contracts.api';
import { formatJalaliDate } from '@/utils/format';
import ContractFormModal from '../components/ContractFormModal';
import CancelDialog from '../components/CancelDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

const STATUS_LABELS: Record<LegalContractStatus, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  COMPLETED: 'خاتمه‌یافته',
  CANCELLED: 'ابطال‌شده',
  TERMINATED: 'فسخ‌شده',
};

const STATUS_COLORS: Record<LegalContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  TERMINATED: 'bg-red-50 text-red-700 border-red-200',
};

export default function ContractsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LegalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LegalContract | null>(null);
  const [cancelling, setCancelling] = useState<LegalContract | null>(null);
  const [deleting, setDeleting] = useState<LegalContract | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await contractsApi.list({
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [kindFilter, statusFilter]);

  const handleCancel = async (reason: string) => {
    if (!cancelling) return;
    setActionLoading(true);
    try {
      await contractsApi.cancel(cancelling.id, reason);
      toast.success('ابطال شد');
      setCancelling(null); load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleActivate = async (c: LegalContract) => {
    try { await contractsApi.activate(c.id); toast.success('فعال شد'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleReactivate = async (c: LegalContract) => {
    try {
      await contractsApi.reactivate(c.id);
      toast.success('به حالت فعال بازگشت');
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بازگشت به فعال');
    }
  };
  const handleComplete = async (c: LegalContract) => {
    try { await contractsApi.complete(c.id); toast.success('خاتمه یافت'); load(); }
    catch { toast.error('خطا'); }
  };

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {
      const res = await contractsApi.remove(deleting.id, force);
      toast.success(force ? 'قرارداد بهطور کامل حذف شد' : 'قرارداد حذف شد');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'CONTRACT_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
      }
    }
  };
  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((c, i) => ({
      'ردیف': i + 1,
      'کد': c.code,
      'نوع': KIND_LABELS[c.kind],
      'عنوان': c.title,
      'طرف قرارداد': c.party?.fullName || '',
      'پروژه': c.project?.name || '',
      'شماره ثبت': c.registrationNumber || '',
      'وضعیت': STATUS_LABELS[c.status],
      'شروع': c.startDate ? new Date(c.startDate).toLocaleDateString('fa-IR') : '',
      'پایان': c.endDate ? new Date(c.endDate).toLocaleDateString('fa-IR') : '',
      'مبلغ کل': c.totalAmount ? Number(c.totalAmount) : '',
    }));
    void exportToExcel({
      filename: 'Contracts-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'Contracts',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            قراردادها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت قراردادهای کارگری، پیمانکاری، کارفرمایی و پیمانکار جزء</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> قرارداد جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ قراردادی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین قرارداد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">طرف قرارداد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-44">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{c.code}</span></td>
                    <td className="px-4 py-3 text-xs">{KIND_LABELS[c.kind]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.party?.fullName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md border', STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => nav('/contracts/' + c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="مشاهده و چاپ">
                          <Printer className="w-4 h-4" />
                        </button>
                        {c.status === 'DRAFT' && (
                          <>
                            <button onClick={() => { setEditing(c); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="ویرایش">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleActivate(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="فعال‌سازی">
                              <Play className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => handleComplete(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="خاتمه">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                                                {(c.status === 'COMPLETED' || c.status === 'CANCELLED' || c.status === 'TERMINATED') && (
                          <button
                            onClick={() => handleReactivate(c)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            title="بازگشت به فعال"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
{c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                          <button onClick={() => setCancelling(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="ابطال">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {(c.status === 'DRAFT' || c.status === 'CANCELLED') && (
                          <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-700" title="حذف کامل">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContractFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <CancelDialog isOpen={!!cancelling} title="ابطال قرارداد"
        message={'دلیل ابطال قرارداد «' + (cancelling?.title || '') + '» را وارد کنید. این عمل برگشت‌پذیر نیست.'}
        loading={actionLoading} onConfirm={handleCancel} onCancel={() => setCancelling(null)} />

      <ConfirmDialog
        isOpen={!!deleting && !forceConfirm}
        title="حذف قرارداد"
        message={deleting ? "قرارداد «" + (deleting.title || "") + "» حذف شود برای قراردادهای غیر پیشنویس این عمل نیاز به دسترسی مدیر دارد." : ""}
        confirmLabel="بله حذف شود"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل قرارداد (مدیر سیستم)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {forceError}
              </p>
              <p className="text-xs text-slate-500">
                با کلیک روی «حذف کامل» تمام ارجاعهای این قرارداد پاک میشود. اطمینان دارید
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setDeleting(null); }} className="btn-secondary">
                  انصراف
                </button>
                <button onClick={() => handleDelete(true)} className="btn-danger">
                  حذف کامل (خطرناک)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
