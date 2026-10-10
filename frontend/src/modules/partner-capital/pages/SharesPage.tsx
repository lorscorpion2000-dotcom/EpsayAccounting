import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, PieChart, Edit, Trash2, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import { partnerCapitalApi, PartnerShare } from '../services/partner-capital.api';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ShareFormModal from '../components/ShareFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import { todayLocalISO } from '@/utils/local-date';
export default function SharesPage() {
  const [items, setItems] = useState<PartnerShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PartnerShare | null>(null);
  const [deleting, setDeleting] = useState<PartnerShare | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await partnerCapitalApi.shares.list();
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await partnerCapitalApi.shares.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((s, i) => ({
      'ردیف': i + 1, 'پروژه': s.project.name, 'شریک': s.partner.name,
      'درصد سهم': Number(s.sharePercent),
      'اعتبار از': new Date(s.effectiveFrom).toLocaleDateString('fa-IR'),
      'اعتبار تا': s.effectiveTo ? new Date(s.effectiveTo).toLocaleDateString('fa-IR') : '—',
      'یادداشت': s.notes || '',
    }));
    void exportToExcel({
      filename: 'PartnerShares-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Shares',
        rows,
      }],
    });
    toast.success('Excel دانلود شد');
  };

  const filtered = search
    ? items.filter((s) =>
        s.partner.name.toLowerCase().includes(search.toLowerCase()) ||
        s.project.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Group by project
  const byProject = filtered.reduce((acc, s) => {
    if (!acc[s.projectId]) acc[s.projectId] = { name: s.project.name, shares: [] };
    acc[s.projectId].shares.push(s);
    return acc;
  }, {} as Record<string, { name: string; shares: PartnerShare[] }>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-violet-600" />
            سهم‌الشرکه پروژه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            درصد مالکیت هر شریک در هر پروژه با اعتبار از/تا
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> سهم جدید
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس شریک یا پروژه..." className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">هیچ سهمی ثبت نشده است</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> اولین سهم
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byProject).map(([projectId, group]) => {
            const total = group.shares.reduce((s, x) => s + Number(x.sharePercent), 0);
            return (
              <div key={projectId} className="card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-l from-violet-50 to-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-bold text-slate-800">{group.name}</h2>
                    <div className="text-xs">
                      <span className="text-slate-500">مجموع سهم‌ها: </span>
                      <span className={total > 100 ? 'text-red-600 font-bold num' : 'text-emerald-600 font-bold num'}>
                        {toPersianDigits(total.toFixed(2))}٪
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">شریک</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">درصد</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">اعتبار از</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600 w-36">اعتبار تا</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">یادداشت</th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.shares.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{s.partner.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-bold num">
                              {toPersianDigits(Number(s.sharePercent).toFixed(2))}٪
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="num text-xs">{formatJalaliDate(s.effectiveFrom)}</span></td>
                          <td className="px-4 py-3">
                            <span className="num text-xs">
                              {s.effectiveTo ? formatJalaliDate(s.effectiveTo) : 'نامحدود'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{s.notes || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditing(s); setShowModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleting(s)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShareFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف سهم"
        message={'آیا از حذف سهم «' + (deleting?.partner.name || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
