import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, ClipboardCheck, Save, CheckCircle2, Send,
  XCircle, TrendingUp, TrendingDown, Package, Printer, Search,
} from 'lucide-react';
import clsx from 'clsx';
import { inventoryCountApi } from '../services/inventory-count.api';
import type { InventoryCount } from '@/types/inventory-count';
import {
  INV_COUNT_STATUS_LABELS, INV_COUNT_STATUS_COLORS,
} from '@/types/inventory-count';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED

export default function InventoryCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InventoryCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try { setData(await inventoryCountApi.get(id)); }
    catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSaveAll = async () => {
    if (!id || !data) return;
    const rows = Object.entries(editing).map(([itemId, physicalQty]) => ({
      itemId, physicalQty: Number(physicalQty),
    }));
    if (rows.length === 0) { toast.error('هیچ تغییری ثبت نشده'); return; }
    setSaving(true);
    try {
      await inventoryCountApi.setItems(id, rows);
      toast.success(`${rows.length} ردیف ذخیره شد`);
      setEditing({});
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setSaving(false); }
  };

  const handleConfirm = async () => {
    if (!id) return;
    if (!confirm('انبارگردانی تایید شود؟')) return;
    try {
      await inventoryCountApi.confirm(id);
      toast.success('تایید شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handlePost = async () => {
    if (!id) return;
    if (!confirm('اختلافات روی موجودی اعمال شود؟ این عمل قابل بازگشت نیست.')) return;
    try {
      await inventoryCountApi.post(id);
      toast.success('اعمال شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('لغو شود؟')) return;
    try {
      await inventoryCountApi.cancel(id);
      toast.success('لغو شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!search) return data.items;
    const s = search.toLowerCase();
    return data.items.filter((it) =>
      it.item?.name?.toLowerCase().includes(s) ||
      it.item?.code?.toLowerCase().includes(s));
  }, [data, search]);

  const totals = useMemo(() => {
    if (!data?.items) return { diffCost: 0, diffQty: 0 };
    return data.items.reduce(
      (acc, it) => ({
        diffCost: acc.diffCost + Number(it.differenceCost),
        diffQty: acc.diffQty + Number(it.difference),
      }),
      { diffCost: 0, diffQty: 0 },
    );
  }, [data]);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }
  if (!data) return null;

  const isDraft = data.status === 'DRAFT';
  const isConfirmed = data.status === 'CONFIRMED';
  const isPosted = data.status === 'POSTED';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/inventory-counts')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> انبارگردانی
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{data.code}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800 num" dir="ltr">{data.code}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', INV_COUNT_STATUS_COLORS[data.status])}>
                  {INV_COUNT_STATUS_LABELS[data.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span>{data.warehouse?.name}</span>
                <span className="text-slate-300">•</span>
                <span className="num">{formatJalaliDate(data.countDate)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <PagePrintButton documentTitle="انبارگردانی" />
            {isDraft && Object.keys(editing).length > 0 && (
              <button className="btn-primary" onClick={handleSaveAll} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره {toPersianDigits(Object.keys(editing).length)} تغییر
              </button>
            )}
            {isDraft && (
              <button className="btn-primary" onClick={handleConfirm}>
                <CheckCircle2 className="w-4 h-4" /> تایید
              </button>
            )}
            {isConfirmed && (
              <button className="btn-primary" onClick={handlePost}>
                <Send className="w-4 h-4" /> ثبت نهایی و اعمال
              </button>
            )}
            {!isPosted && data.status !== 'CANCELLED' && (
              <button className="btn-secondary" onClick={handleCancel}>
                <XCircle className="w-4 h-4" /> لغو
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-500">تعداد ردیف</div>
            <div className="text-xl font-bold num">{toPersianDigits(data.items?.length || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">جمع اختلاف تعداد</div>
            <div className={clsx('text-xl font-bold num', totals.diffQty >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {toPersianDigits(totals.diffQty.toFixed(2))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">جمع اختلاف ریالی</div>
            <div className={clsx('text-xl font-bold num', totals.diffCost >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {toPersianDigits(Math.round(totals.diffCost).toLocaleString())} ریال
            </div>
          </div>
        </div>
      </div>

      {data.notes && (
        <div className="card p-4 text-sm text-slate-700">
          <span className="font-bold">توضیحات: </span>{data.notes}
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کالا..." className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            هیچ کالایی در این انبار موجود نیست
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">کد</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">کالا</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">واحد</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">موجودی سیستم</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-28">شمارش فیزیکی</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-600 w-20">اختلاف</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600 w-32">اختلاف ریالی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it, idx) => {
                  const currentPhysical = it.itemId in editing ? editing[it.itemId] : Number(it.physicalQty);
                  const diff = currentPhysical - Number(it.systemQty);
                  const unitCost = Number(it.unitCost);
                  const diffCost = diff * unitCost;
                  const hasChange = it.itemId in editing;
                  return (
                    <tr key={it.id || it.itemId} className={clsx('hover:bg-slate-50/50', hasChange && 'bg-amber-50/30')}>
                      <td className="px-3 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                      <td className="px-3 py-2">
                        <span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">
                          {it.item?.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-xs">{it.item?.name}</td>
                      <td className="px-3 py-2 text-center text-xs text-slate-500">{it.item?.unit}</td>
                      <td className="px-3 py-2 text-center num text-xs">
                        {toPersianDigits(Number(it.systemQty).toFixed(2))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isDraft ? (
                          <input
                            type="number"
                            step="0.01"
                            value={currentPhysical}
                            onChange={(e) => setEditing({ ...editing, [it.itemId]: Number(e.target.value) })}
                            className="input num text-xs py-1.5 text-center w-24 mx-auto"
                            dir="ltr"
                          />
                        ) : (
                          <span className="num text-xs">{toPersianDigits(Number(it.physicalQty).toFixed(2))}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-bold',
                          Math.abs(diff) < 0.0001 ? 'bg-slate-100 text-slate-500' :
                          diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                          {Math.abs(diff) < 0.0001 ? '—' : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {Math.abs(diff) < 0.0001 ? '' : toPersianDigits(diff.toFixed(2))}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-2 text-left num text-xs font-bold',
                        diffCost > 0 ? 'text-emerald-700' : diffCost < 0 ? 'text-red-700' : 'text-slate-400')}>
                        {diffCost === 0 ? '—' : toPersianDigits(Math.round(diffCost).toLocaleString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                    جمع اختلافات:
                  </td>
                  <td className="px-3 py-3 text-center num text-sm font-bold">
                    {toPersianDigits(totals.diffQty.toFixed(2))}
                  </td>
                  <td className={clsx('px-3 py-3 text-left num text-sm font-bold',
                    totals.diffCost >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                    {toPersianDigits(Math.round(totals.diffCost).toLocaleString())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      {isDraft && (
        <div className="card p-4 border-s-4 border-s-amber-400 bg-amber-50/40">
          <div className="flex items-start gap-3 text-sm text-amber-900">
            <Package className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">راهنمای انبارگردانی</div>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>مقادیر فیزیکی را در ستون «شمارش فیزیکی» وارد کنید.</li>
                <li>اختلاف به‌صورت خودکار محاسبه می‌شود.</li>
                <li>پس از اتمام، دکمه «ذخیره تغییر» را بزنید.</li>
                <li>سپس «تایید» کنید تا آماده ثبت نهایی شود.</li>
                <li>در «ثبت نهایی»، اختلافات روی موجودی انبار اعمال می‌شوند.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
