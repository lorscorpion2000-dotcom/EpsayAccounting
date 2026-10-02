import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, FileCheck2, Edit, Trash2, RefreshCw,
  FileSpreadsheet, AlertTriangle, Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import { timelineApi, Permit, PermitType, PermitStatus } from '../services/timeline.api';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import PermitFormModal from '../components/PermitFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
const TYPE_LABELS: Record<PermitType, string> = {
  DEMOLITION: 'تخریب', CONSTRUCTION: 'ساخت', NO_VIOLATION: 'عدم خلاف',
  COMPLETION: 'پایان کار', OTHER: 'سایر',
};
const STATUS_LABELS: Record<PermitStatus, string> = {
  PENDING: 'در انتظار', ISSUED: 'صادرشده', EXPIRED: 'منقضی', CANCELLED: 'لغو‌شده',
};
const STATUS_COLORS: Record<PermitStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function PermitsPage() {
  const [items, setItems] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);
  const [deleting, setDeleting] = useState<Permit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.permits.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.permits.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((p, i) => ({
      'ردیف': i + 1, 'کد': p.code, 'پروژه': p.project.name,
      'نوع': TYPE_LABELS[p.type], 'عنوان': p.title,
      'شماره': p.number || '', 'مرجع': p.authority || '',
      'وضعیت': STATUS_LABELS[p.status],
      'تاریخ صدور': p.issueDate ? new Date(p.issueDate).toLocaleDateString('fa-IR') : '',
      'تاریخ انقضا': p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    void exportToExcel({
      filename: 'Permits-' + new Date().toISOString().slice(0, 10) + '.xlsx',
      sheets: [{
        name: 'Permits',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (p: Permit) => {
    if (!p.expiryDate || p.status !== 'ISSUED') return false;
    const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-brand-600" />
            مجوزها و پروانه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">ردیابی صدور پروانه‌های تخریب، ساخت، عدم خلاف و پایان کار</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> مجوز جدید
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
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ مجوزی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین مجوز
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
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">تاریخ انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => {
                  const expiring = isExpiringSoon(p);
                  return (
                    <tr key={p.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{p.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[p.type]}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{p.title}</div>
                        {p.number && <div className="text-xs text-slate-500 num">شماره: {p.number}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.project.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {p.expiryDate ? formatJalaliDate(p.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md border', STATUS_COLORS[p.status])}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditing(p); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="w-4 h-4" />
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

      <PermitFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف مجوز"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
