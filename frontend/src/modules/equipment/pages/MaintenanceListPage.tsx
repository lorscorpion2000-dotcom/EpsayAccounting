import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import { toast } from 'sonner';
import {
  Plus, Loader2, Wrench, Trash2, RefreshCw,
} from 'lucide-react';

import { equipmentApi } from '../services/equipment.api';
import type { EquipmentMaintenance, Equipment } from '@/types/equipment';
import { MAINTENANCE_TYPE_LABELS } from '@/types/equipment';
import { api } from '@/services/api';
import type { Project } from '@/types/project';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function MaintenanceListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EquipmentMaintenance[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actionItem, setActionItem] = useState<EquipmentMaintenance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, prj, eq] = await Promise.all([
        equipmentApi.maintenances.list({
          type: typeFilter || undefined,
          projectId: projectFilter || undefined,
          equipmentId: equipmentFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        api.get('/projects').then((r) => r.data).catch(() => []),
        equipmentApi.equipment.list().catch(() => []),
      ]);
      setItems(data);
      setProjects(prj);
      setEquipments(eq);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter, projectFilter, equipmentFilter, fromDate, toDate]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await equipmentApi.maintenances.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  const totalCost = items.reduce((s, m) => s + Number(m.cost), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-brand-600" />
            سوخت، نگهداری و تعمیرات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ثبت هزینه‌های نگهداری و تعمیرات ماشین‌آلات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-primary" onClick={() => navigate('/equipment/maintenances/new')}>
            <Plus className="w-4 h-4" /> ثبت تعمیر
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">تعداد رکورد</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(items.length)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">جمع هزینه</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(Math.round(totalCost).toLocaleString())}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="input">
            <option value="">همه ماشین‌ها</option>
            {equipments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input">
            <option value="">همه پروژه‌ها</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
            <option value="">همه انواع</option>
            {Object.entries(MAINTENANCE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <PersianDatePicker value={fromDate} onChange={setFromDate} />
          <PersianDatePicker value={toDate} onChange={setToDate} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">هیچ رکورد تعمیری ثبت نشده است</p>
            <button className="btn-primary" onClick={() => navigate('/equipment/maintenances/new')}>
              <Plus className="w-4 h-4" /> ثبت اولین تعمیر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">ماشین</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">تاریخ</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-32">نوع</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">شرح</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">تأمین‌کننده</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-28">هزینه</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{m.code}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-800 text-xs">{m.equipment?.name}</td>
                    <td className="px-3 py-3 text-center num text-xs">{formatJalaliDate(m.maintenanceDate)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                        {MAINTENANCE_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 text-xs">{m.description}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{m.vendor || '—'}</td>
                    <td className="px-3 py-3 text-left num text-xs">{toPersianDigits(Number(m.cost).toLocaleString())}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setActionItem(m)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionItem}
        title="حذف رکورد تعمیر"
        message={actionItem ? `آیا از حذف «${actionItem.code}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}
