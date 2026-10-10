import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, FileImage, Edit, Trash2, RefreshCw,
  FileSpreadsheet, CheckCircle2, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { timelineApi, TechnicalDocument, DocumentType, DocumentPhase } from '../services/timeline.api';
import { formatJalaliDate } from '@/utils/format';
import DocumentFormModal from '../components/DocumentFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import { exportToExcel } from '@/utils/export-excel';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import { todayLocalISO } from '@/utils/local-date';
const TYPE_LABELS: Record<DocumentType, string> = {
  ARCHITECTURE: 'معماری', STRUCTURE: 'سازه',
  MEP: 'تاسیسات مکانیکی و برقی', SITE_PLAN: 'پلان سایت', OTHER: 'سایر',
};
const PHASE_LABELS: Record<DocumentPhase, string> = {
  PHASE_1: 'فاز ۱', PHASE_2: 'فاز ۲', OTHER: 'سایر',
};

export default function DocumentsPage() {
  const [items, setItems] = useState<TechnicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TechnicalDocument | null>(null);
  const [deleting, setDeleting] = useState<TechnicalDocument | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await timelineApi.documents.list({
        type: typeFilter || undefined,
        phase: phaseFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, phaseFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    setActionLoading(true);
    try {
      await timelineApi.documents.remove(deleting.id);
      toast.success('حذف شد');
      setDeleting(null); load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleExportExcel = () => {
    if (!items.length) { toast.info('داده‌ای وجود ندارد'); return; }
    const rows = items.map((d, i) => ({
      'ردیف': i + 1, 'کد': d.code, 'پروژه': d.project.name,
      'نوع': TYPE_LABELS[d.type], 'فاز': PHASE_LABELS[d.phase],
      'عنوان': d.title, 'نسخه': d.version,
      'تایید': d.isApproved ? 'بله' : 'خیر',
      'تاریخ تایید': d.approvedAt ? new Date(d.approvedAt).toLocaleDateString('fa-IR') : '',
    }));
    void exportToExcel({
      filename: 'Documents-' + todayLocalISO() + '.xlsx',
      sheets: [{
        name: 'Documents',
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
            <FileImage className="w-6 h-6 text-violet-600" />
            آرشیو اسناد فنی و نقشه‌ها
          </h1>
          <p className="text-sm text-slate-500 mt-1">نگهداری آخرین نسخ تاییدشده نقشه‌های فاز ۱ و فاز ۲</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-secondary" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> سند جدید
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
          <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="input">
            <option value="">همه فازها</option>
            {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ سند فنی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین سند
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">فاز</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">نسخه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">تایید</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3"><span className="num text-xs font-mono" dir="ltr">{d.code}</span></td>
                    <td className="px-4 py-3 text-xs">{TYPE_LABELS[d.type]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{PHASE_LABELS[d.phase]}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{d.project.name}</td>
                    <td className="px-4 py-3 text-center"><span className="num text-xs">{d.version}</span></td>
                    <td className="px-4 py-3 text-center">
                      {d.isApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> تایید
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> در انتظار
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/timeline/documents"
                          id={d.id}
                          itemLabel={(d as any).code || (d as any).name || (d as any).title || (d as any).fullName || (d as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => { setEditing(d); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleting(d)}
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
        )}
      </div>

      <DocumentFormModal isOpen={showModal} editing={editing}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />

      <ConfirmDialog isOpen={!!deleting} title="حذف سند فنی"
        message={'آیا از حذف «' + (deleting?.title || '') + '» اطمینان دارید؟'}
        confirmLabel="بله، حذف شود" variant="danger" loading={actionLoading}
        onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
