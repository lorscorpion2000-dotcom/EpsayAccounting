import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, ShieldCheck, Edit, RefreshCw, FileSpreadsheet, AlertTriangle, Archive } from 'lucide-react';
import clsx from 'clsx';
import { timelineApi, Insurance, InsuranceType } from '../services/timeline.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import InsuranceFormModal from '../components/InsuranceFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const TYPE_LABELS: Record<InsuranceType, string> = {
  THIRD_PARTY: 'مسئولیت مدنی', ACCIDENT: 'حوادث', FIRE: 'آتش‌سوزی',
  EQUIPMENT: 'ماشین‌آلات', OTHER: 'سایر',
};

export default function InsurancesPage() {
  const [items, setItems] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [deleting, setDeleting] = useState<Insurance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.insurances.list({
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.insurances.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((i, idx) => ({
      'ردیف': idx + 1, 'کد': i.code,
      'نوع': TYPE_LABELS[i.type], 'عنوان': i.title,
      'بیمه‌گر': i.insurer || '', 'شماره': i.policyNumber || '',
      'مبلغ پوشش': i.coverageAmount ? Number(i.coverageAmount) : 0,
      'حق بیمه': i.premiumAmount ? Number(i.premiumAmount) : 0,
      'شروع': i.startDate ? new Date(i.startDate).toLocaleDateString('fa-IR') : '',
      'انقضا': i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    void exportToExcel({
      filename: 'Insurances-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Insurances',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (i: Insurance) => {
    if (!i.expiryDate) return false;
    const days = Math.floor((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            بیمه‌نامه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت بیمه مسئولیت، حوادث، آتش‌سوزی و ماشین‌آلات</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> بیمه‌نامه جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو..." className="input ps-10 pe-4 w-full" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ بیمه‌نامه‌ای ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین بیمه‌نامه
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">بیمه‌گر</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ پوشش</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => {
                  const expiring = isExpiringSoon(i);
                  return (
                    <tr key={i.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{i.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[i.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{i.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{i.insurer || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-xs" dir="ltr">
                          {i.coverageAmount ? formatNumber(Number(i.coverageAmount)) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {i.expiryDate ? formatJalaliDate(i.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/timeline/insurances"
                          id={i.id}
                          itemLabel={(i as any).code || (i as any).name || (i as any).title || (i as any).fullName || (i as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => { setEditing(i); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(i)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InsuranceFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف بیمه‌نامه"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
