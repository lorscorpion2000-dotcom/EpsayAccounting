import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Lock, Edit, RefreshCw, FileSpreadsheet, AlertTriangle, Archive } from 'lucide-react';
import clsx from 'clsx';
import { timelineApi, Guarantee, GuaranteeType } from '../services/timeline.api';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import GuaranteeFormModal from '../components/GuaranteeFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const TYPE_LABELS: Record<GuaranteeType, string> = {
  BANK_GUARANTEE: 'ضمانت‌نامه بانکی', CHECK: 'چک تضمین',
  DEPOSIT: 'وجه‌الضمان نقدی', OTHER: 'سایر',
};

export default function GuaranteesPage() {
  const [items, setItems] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Guarantee | null>(null);
  const [deleting, setDeleting] = useState<Guarantee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.guarantees.list({
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
      await timelineApi.guarantees.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((g, i) => ({
      'ردیف': i + 1, 'کد': g.code, 'نوع': TYPE_LABELS[g.type],
      'عنوان': g.title, 'صادرکننده': g.issuer || '', 'ذی‌نفع': g.beneficiary || '',
      'مبلغ': Number(g.amount),
      'صدور': g.issueDate ? new Date(g.issueDate).toLocaleDateString('fa-IR') : '',
      'انقضا': g.expiryDate ? new Date(g.expiryDate).toLocaleDateString('fa-IR') : '',
    }));
    void exportToExcel({
      filename: 'Guarantees-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Guarantees',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const isExpiringSoon = (g: Guarantee) => {
    if (!g.expiryDate) return false;
    const days = Math.floor((new Date(g.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 60;
  };

  const totalAmount = items.reduce((s, g) => s + Number(g.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-amber-600" />
            تضامین و ضمانت‌نامه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت چک‌ها، ضمانت‌نامه‌ها و وجوه الضمان</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> تضمین جدید
          </button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">تعداد کل</div>
            <div className="text-xl font-bold text-slate-800 num">{items.length}</div>
          </div>
          <div className="card p-4 bg-gradient-to-bl from-amber-50 to-white border-amber-200">
            <div className="text-xs text-amber-700 mb-1">مجموع مبالغ</div>
            <div className="text-xl font-bold text-amber-700 num">{formatNumber(totalAmount)}</div>
            <div className="text-xs text-amber-600">ریال</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-500 mb-1">منقضی در ۶۰ روز</div>
            <div className="text-xl font-bold text-red-700 num">{items.filter(isExpiringSoon).length}</div>
          </div>
        </div>
      )}

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
            <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ تضمینی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین تضمین
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
                  <th className="text-right px-4 py-3 font-medium text-slate-600">صادرکننده</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-40">مبلغ (ریال)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">انقضا</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((g) => {
                  const expiring = isExpiringSoon(g);
                  return (
                    <tr key={g.id} className={clsx('hover:bg-slate-50/50', expiring && 'bg-amber-50/40')}>
                      <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{g.code}</span></td>
                      <td className="px-4 py-3 text-xs">{TYPE_LABELS[g.type]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{g.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{g.issuer || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="num text-xs font-bold text-amber-700" dir="ltr">
                          {formatNumber(Number(g.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {expiring && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                          <span className={clsx('num text-xs', expiring && 'text-amber-700 font-bold')}>
                            {g.expiryDate ? formatJalaliDate(g.expiryDate) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/timeline/guarantees"
                          id={g.id}
                          itemLabel={(g as any).code || (g as any).name || (g as any).title || (g as any).fullName || (g as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => { setEditing(g); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(g)}
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

      <GuaranteeFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف تضمین"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
