import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Building2, Edit, RefreshCw, X } from 'lucide-react';
import clsx from 'clsx';
import { salesApi, SalesUnit, SalesUnitStatus } from '../services/sales.api';
import { projectsApi } from '@/modules/projects/services/projects.api';
import { formatNumber } from '@/utils/format';
import AdminDeleteButton from '@/components/AdminDeleteButton';

const STATUS_LABELS: Record<SalesUnitStatus, string> = {
  AVAILABLE: 'قابل فروش', RESERVED: 'رزرو', SOLD: 'فروخته‌شده',
  DELIVERED: 'تحویل‌شده', CANCELLED: 'ابطال‌شده',
};

const STATUS_COLORS: Record<SalesUnitStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  RESERVED: 'bg-amber-50 text-amber-700',
  SOLD: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function SalesUnitsPage() {
  const [items, setItems] = useState<SalesUnit[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalesUnit | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await salesApi.units.list({
        projectId: projectFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch { toast.error('خطا'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    projectsApi.list().then(setProjects as any).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [projectFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-600" />
            واحدهای قابل فروش
          </h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت واحدهای مسکونی/تجاری هر پروژه</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> واحد جدید
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="جستجو بر اساس شماره واحد یا بلوک..."
              className="input ps-10 pe-4 w-full" />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">واحدی ثبت نشده است</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> اولین واحد
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-24">بلوک</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">شماره واحد</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">طبقه</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">متراژ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">خواب</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">قیمت لیست</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs">{u.project?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{u.block || '—'}</td>
                    <td className="px-4 py-3 font-medium num">{u.unitNumber}</td>
                    <td className="px-4 py-3 text-center num">{u.floor ?? '—'}</td>
                    <td className="px-4 py-3 text-center num">{u.area ? Number(u.area).toLocaleString('fa-IR') : '—'}</td>
                    <td className="px-4 py-3 text-center num">{u.bedrooms ?? '—'}</td>
                    <td className="px-4 py-3 text-left num" dir="ltr">{u.listPrice ? formatNumber(Number(u.listPrice)) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-md', STATUS_COLORS[u.status])}>
                        {STATUS_LABELS[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AdminDeleteButton
                          endpoint="/sales/units"
                          id={u.id}
                          itemLabel={(u as any).code || (u as any).name || (u as any).title || (u as any).fullName || ''}
                          onSuccess={load}
                        />
                        <button onClick={() => { setEditing(u); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
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

      <UnitFormModal isOpen={showModal} editing={editing} projects={projects}
        onClose={() => { setShowModal(false); setEditing(null); }} onSaved={load} />
    </div>
  );
}

function UnitFormModal({ isOpen, editing, projects, onClose, onSaved }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    projectId: '', unitNumber: '', block: '', floor: '', area: '',
    bedrooms: '', parkingCount: '', storageCount: '', listPrice: '',
    status: 'AVAILABLE', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        projectId: editing.projectId, unitNumber: editing.unitNumber,
        block: editing.block || '', floor: editing.floor ?? '',
        area: editing.area ?? '', bedrooms: editing.bedrooms ?? '',
        parkingCount: editing.parkingCount ?? '', storageCount: editing.storageCount ?? '',
        listPrice: editing.listPrice ?? '', status: editing.status, notes: editing.notes || '',
      });
    } else {
      setForm({
        projectId: projects[0]?.id || '', unitNumber: '', block: '',
        floor: '', area: '', bedrooms: '', parkingCount: '', storageCount: '',
        listPrice: '', status: 'AVAILABLE', notes: '',
      });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.projectId) { toast.error('پروژه الزامی است'); return; }
    if (!form.unitNumber.trim()) { toast.error('شماره واحد الزامی است'); return; }
    setSaving(true);
    try {
      const p: any = { ...form };
      ['floor', 'area', 'bedrooms', 'parkingCount', 'storageCount', 'listPrice'].forEach((k) => {
        if (p[k] === '' || p[k] === null) delete p[k];
        else p[k] = Number(p[k]);
      });
      Object.keys(p).forEach((k) => { if (p[k] === '') delete p[k]; });
      if (editing) await salesApi.units.update(editing.id, p);
      else await salesApi.units.create(p);
      toast.success(editing ? 'ویرایش شد' : 'ثبت شد');
      onSaved(); onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">{editing ? 'ویرایش واحد' : 'واحد جدید'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">پروژه *</label>
              <select value={form.projectId} onChange={(e) => set('projectId', e.target.value)} className="input w-full">
                <option value="">انتخاب کنید...</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">بلوک</label>
              <input value={form.block} onChange={(e) => set('block', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره واحد *</label>
              <input value={form.unitNumber} onChange={(e) => set('unitNumber', e.target.value)} className="input w-full num" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">طبقه</label>
              <input type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">متراژ (متر مربع)</label>
              <input type="number" value={form.area} onChange={(e) => set('area', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تعداد خواب</label>
              <input type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">پارکینگ</label>
              <input type="number" value={form.parkingCount} onChange={(e) => set('parkingCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">انبار</label>
              <input type="number" value={form.storageCount} onChange={(e) => set('storageCount', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قیمت لیست (ریال)</label>
              <input type="number" value={form.listPrice} onChange={(e) => set('listPrice', e.target.value)} className="input w-full num" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">وضعیت</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input w-full">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">یادداشت</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}
