import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Trash2, Loader2, RefreshCw, RotateCcw, FileText, ShoppingCart, ShoppingBag,
  BookOpen, AlertCircle, ExternalLink, Archive, Calendar, Wallet, Building2,
  Users as UsersIcon, Package, Truck,
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { recycleBinApi, RecycleItem, RecycleEntityDef } from '../services/recycle-bin.api';
import { formatJalaliDate, formatNumber, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

const ENTITY_ICONS: Record<string, any> = {
  'purchase-invoice': FileText,
  'purchase-order': ShoppingBag,
  'purchase-request': ShoppingCart,
  'journal-entry': BookOpen,
  'fiscal-year': Calendar,
  'cheque': FileText,
  'petty-cash-account': Wallet,
  'petty-cash-request': Wallet,
  'petty-cash-tx': Wallet,
  'fixed-asset': Building2,
  'expense': FileText,
  'expense-category': Package,
  'overhead-allocation': FileText,
  'adjustment-index': FileText,
  'adjustment': FileText,
  'material-price-diff': FileText,
  'user': UsersIcon,
  'role': UsersIcon,
  'partner': UsersIcon,
  'project': Building2,
  'contract': FileText,
  'unit': FileText,
  'warehouse': Package,
  'item-category': Package,
  'item': Package,
  'price-list': FileText,
  'daily-report': FileText,
  'subcontractor-statement': FileText,
  'worker-statement': FileText,
  'client-statement': FileText,
  'sales-invoice': FileText,
  'sales-receipt': Wallet,
  'sales-contract': FileText,
  'sales-customer': UsersIcon,
  'sales-unit': Building2,
  'supplier-payment': Wallet,
  'equipment': Truck,
  'equipment-daily-log': Truck,
  'equipment-maintenance': Truck,
  'employee-profile': UsersIcon,
  'payroll-period': Calendar,
  'payroll-record': FileText,
  'attendance': Calendar,
  'daily-work-log': Calendar,
  'leave-request': Calendar,
  'advance-request': Wallet,
  'partner-capital': Wallet,
  'permit': FileText,
  'insurance': FileText,
  'guarantee': FileText,
  'document': FileText,
  'checklist': FileText,
};

const ENTITY_COLORS: Record<string, string> = {
  'purchase-invoice': 'bg-blue-50 text-blue-700',
  'purchase-order': 'bg-violet-50 text-violet-700',
  'purchase-request': 'bg-amber-50 text-amber-700',
  'journal-entry': 'bg-emerald-50 text-emerald-700',
  'fiscal-year': 'bg-cyan-50 text-cyan-700',
};

const DEFAULT_COLOR = 'bg-slate-100 text-slate-700';
const DEFAULT_ICON = Archive;

function iconFor(entity: string) {
  return ENTITY_ICONS[entity] || DEFAULT_ICON;
}
function colorFor(entity: string) {
  return ENTITY_COLORS[entity] || DEFAULT_COLOR;
}

export default function RecycleBinPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<string>('all');
  const [restoreTarget, setRestoreTarget] = useState<RecycleItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [entityDefs, setEntityDefs] = useState<RecycleEntityDef[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [list, c, defs] = await Promise.all([
        recycleBinApi.list(tab),
        recycleBinApi.counts(),
        entityDefs.length > 0 ? Promise.resolve(entityDefs) : recycleBinApi.entities(),
      ]);
      setItems(list);
      setCounts(c as any);
      if (entityDefs.length === 0) setEntityDefs(defs);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setActionLoading(true);
    try {
      await recycleBinApi.restore(restoreTarget.entity, restoreTarget.id);
      toast.success('با موفقیت بازیابی شد');
      setRestoreTarget(null);
      load();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally {
      setActionLoading(false);
    }
  };

  // Tabs از روی counts + label از entityDefs (ثابت، مستقل از items جاری)
  const labelByKey = new Map(entityDefs.map(d => [d.key, d.label]));
  const entityKeys = Object.keys(counts).filter(k => k !== 'total' && (counts[k] || 0) > 0);
  const tabs: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'همه', count: counts.total || 0 },
    ...entityKeys.map(k => ({
      key: k,
      label: labelByKey.get(k) || k,
      count: counts[k] || 0,
    })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-600" />
            سوابق حذف
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            رکوردهای حذف‌شده — قابل بازیابی توسط مدیر
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بازخوانی
        </button>
      </div>

      <div className="card p-4 border-s-4 border-s-amber-500 bg-amber-50/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            رکوردهای این صفحه به‌صورت موقت حذف شده‌اند و تا زمان بازیابی،
            در بخش‌های اصلی نمایش داده نمی‌شوند.
          </div>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}
              >
                {t.label}
                <span className={clsx(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold num',
                  tab === t.key ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-600',
                )}>
                  {toPersianDigits(t.count)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Trash2 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700 mb-1">سوابق حذف خالی است</p>
          <p className="text-sm text-slate-500">هیچ رکورد حذف‌شده‌ای وجود ندارد</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-44">نوع</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">کد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">مبلغ</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">تاریخ حذف</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-36">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => {
                  const Icon = iconFor(it.entity);
                  return (
                    <tr key={it.entity + ':' + it.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium', colorFor(it.entity))}>
                          <Icon className="w-3.5 h-3.5" />
                          {it.entityLabel || it.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="num text-xs font-mono" dir="ltr">{it.code || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 truncate max-w-md">{it.title || '—'}</td>
                      <td className="px-4 py-3 text-left">
                        {it.amount != null && it.amount > 0
                          ? <span className="num text-slate-700">{formatNumber(it.amount)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center num text-xs text-slate-500">
                        {formatJalaliDate(it.deletedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => nav(it.link)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="مشاهده"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRestoreTarget(it)}
                            className="btn-primary text-xs py-1.5 px-3"
                            title="بازیابی"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            بازیابی
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!restoreTarget}
        title="بازیابی رکورد"
        message={restoreTarget
          ? 'رکورد «' + (restoreTarget.code || restoreTarget.title || '') + '» بازیابی شود؟ پس از بازیابی، در بخش اصلی نمایش داده می‌شود.'
          : ''}
        confirmLabel="بله، بازیابی کن"
        variant="info"
        loading={actionLoading}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
  );
}
