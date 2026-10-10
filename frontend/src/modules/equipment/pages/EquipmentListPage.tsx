import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus, Search, Loader2, Truck, Eye, Edit, Trash2, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { equipmentApi } from '../services/equipment.api';
import type { Equipment } from '@/types/equipment';
import {
  EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_OWNERSHIP_LABELS,
} from '@/types/equipment';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import { toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function EquipmentListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Equipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [actionItem, setActionItem] = useState<Equipment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj] = await Promise.all([
        equipmentApi.equipment.list({
          search: search || undefined,
          status: statusFilter || undefined,
          ownership: ownershipFilter || undefined,
          projectId: projectFilter || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, ownershipFilter, projectFilter]);

  const handleDelete = async (force = false) => {
    if (!actionItem) return;
    setActionLoading(true);
    setForceError(null);
    try {
      await equipmentApi.equipment.remove(actionItem.id, force);
      toast.success(force ? 'بهطور کامل حذف شد' : 'حذف/اسقاط شد');
      setActionItem(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'EQUIPMENT_HAS_REFS') {
        setForceError(err.message);
      } else {
        const msg = err?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = search
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        i.plateNumber?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-brand-600" />
            شناسنامه ماشین‌آلات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت ماشین‌آلات ملکی و اجاره‌ای
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={() => navigate('/equipment/new')}>
            <Plus className="w-4 h-4" /> ماشین جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو (نام، کد، پلاک)..."
              className="input ps-10 pe-4 w-full"
            />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)} className="input">
            <option value="">همه مالکیت‌ها</option>
            <option value="OWNED">ملکی</option>
            <option value="RENTED">اجاره‌ای</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ ماشینی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/equipment/new')}>
              <Plus className="w-4 h-4" /> اولین ماشین
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">نام</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">پلاک</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">مالکیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">نرخ ساعتی</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">پروژه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">
                        {eq.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <div>{eq.name}</div>
                      {eq.brand && <div className="text-xs text-slate-400">{eq.brand} {eq.model}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="num text-xs" dir="ltr">{eq.plateNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {EQUIPMENT_OWNERSHIP_LABELS[eq.ownership]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-block text-xs px-2 py-0.5 rounded-md', EQUIPMENT_STATUS_COLORS[eq.status])}>
                        {EQUIPMENT_STATUS_LABELS[eq.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left num text-xs">
                      {eq.hourlyRate ? toPersianDigits(Number(eq.hourlyRate).toLocaleString()) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600">
                      {eq.currentProject?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/equipment"
                          id={eq.id}
                          itemLabel={(eq as any).code || (eq as any).name || (eq as any).title || (eq as any).fullName || (eq as any).serialNumber || ''}
                          onSuccess={load}
                        />
                        <button
                          onClick={() => navigate(`/equipment/${eq.id}`)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                          title="مشاهده"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/equipment/${eq.id}/edit`)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActionItem(eq)}
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

      <ConfirmDialog
        isOpen={!!actionItem && !forceConfirm}
        title="حذف ماشین"
        message={actionItem ? "ماشین «" + actionItem.name + "» حذف/اسقاط شود" : ""}
        confirmLabel="بله"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setActionItem(null); setForceError(null); }}
      />

      {forceError && actionItem && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل ماشین (مدیر سیستم)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <p className="text-xs text-slate-500">با کلیک روی «حذف کامل» تمام کارکردها تعمیرات و ارجاعها پاک میشود.</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setActionItem(null); }} className="btn-secondary">انصراف</button>
                <button onClick={() => handleDelete(true)} className="btn-danger">حذف کامل (خطرناک)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}