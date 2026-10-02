import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, Search, BookMarked, FileSpreadsheet, Printer, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { Item, Warehouse, KardexResult } from '@/types/warehouse';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS, ITEM_UNIT_LABELS } from '@/types/warehouse';
import { formatNumber, formatJalaliDate, toPersianDigits } from '@/utils/format';

import { exportToExcel } from '@/utils/export-excel';
export default function KardexPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<KardexResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    warehouseApi.items.list().then(setItems);
    warehouseApi.warehouses.list().then(setWarehouses);
  }, []);

  const loadData = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const data = await warehouseApi.reports.kardex({
        itemId: selectedItem,
        warehouseId: selectedWarehouse || undefined,
      });
      setResult(data);
    } catch {
      toast.error('خطا در بارگذاری کاردکس');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedItem) loadData(); }, [selectedItem, selectedWarehouse]);

  const filteredItems = search
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleExportExcel = () => {
    if (!result || !result.item) return;
    const rows = result.rows.map((r, i) => ({
      'ردیف': i + 1,
      'تاریخ': new Date(r.date).toLocaleDateString('fa-IR'),
      'نوع': MOVEMENT_TYPE_LABELS[r.type],
      'انبار': r.warehouse.name,
      'شرح': r.description || '',
      'ورود': r.inQty || '',
      'خروج': r.outQty || '',
      'مانده': r.balance,
      'بهای واحد': r.unitCost,
      'ارزش': r.totalCost,
    }));
    if (result.totals) {
      rows.push({
        'ردیف': '' as any,
        'تاریخ': '',
        'نوع': '' as any,
        'انبار': '',
        'شرح': 'جمع کل',
        'ورود': result.totals.inQty,
        'خروج': result.totals.outQty,
        'مانده': 0,
        'بهای واحد': 0,
        'ارزش': 0,
      });
    }
    void exportToExcel({
      filename: `Kardex-${result.item.code}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{
        name: 'Kardex',
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
            <BookMarked className="w-6 h-6 text-brand-600" />
            کاردکس کالا
          </h1>
          <p className="text-sm text-slate-500 mt-1">گردش کامل یک کالا با مانده جاری</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button className="btn-secondary" onClick={handleExportExcel} disabled={!result}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button className="btn-secondary" onClick={() => window.print()} disabled={!result}>
            <Printer className="w-4 h-4" /> چاپ
          </button>
        </div>
      </div>

      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی کالا..."
              className="input ps-10 pe-4 w-full"
            />
          </div>
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="input">
            <option value="">— انتخاب کالا —</option>
            {filteredItems.map((it) => (
              <option key={it.id} value={it.id}>{it.code} — {it.name}</option>
            ))}
          </select>
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="input">
            <option value="">همه انبارها</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedItem ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">برای مشاهده کاردکس، یک کالا انتخاب کنید</p>
        </div>
      ) : loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !result?.item || result.rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500">هیچ گردشی برای این کالا ثبت نشده است</p>
        </div>
      ) : (
        <>
          <div className="card p-4 bg-gradient-to-bl from-brand-50 to-white border-brand-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-slate-500">کالا</div>
                <div className="text-lg font-bold text-slate-800">
                  <span className="num font-mono text-sm text-slate-500 me-2" dir="ltr">{result.item.code}</span>
                  {result.item.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  واحد: {ITEM_UNIT_LABELS[result.item.unit]}
                </div>
              </div>
              {result.totals && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-emerald-700">مجموع ورود</div>
                    <div className="font-bold text-emerald-700 num">{toPersianDigits(result.totals.inQty.toFixed(2))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-rose-700">مجموع خروج</div>
                    <div className="font-bold text-rose-700 num">{toPersianDigits(result.totals.outQty.toFixed(2))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-brand-700">مانده</div>
                    <div className="font-bold text-brand-700 num">
                      {toPersianDigits((result.totals.inQty - result.totals.outQty).toFixed(2))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-center px-3 py-3 font-medium text-slate-600 w-12">#</th>
                    <th className="text-right px-3 py-3 font-medium text-slate-600 w-28">تاریخ</th>
                    <th className="text-center px-3 py-3 font-medium text-slate-600 w-24">نوع</th>
                    <th className="text-right px-3 py-3 font-medium text-slate-600 w-32">انبار</th>
                    <th className="text-right px-3 py-3 font-medium text-slate-600">شرح</th>
                    <th className="text-left px-3 py-3 font-medium text-slate-600 w-24">ورود</th>
                    <th className="text-left px-3 py-3 font-medium text-slate-600 w-24">خروج</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-700 w-28">مانده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-center text-slate-500 num text-xs">{toPersianDigits(idx + 1)}</td>
                      <td className="px-3 py-2.5"><span className="num text-xs">{formatJalaliDate(r.date)}</span></td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-md', MOVEMENT_TYPE_COLORS[r.type])}>
                          {MOVEMENT_TYPE_LABELS[r.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{r.warehouse.name}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {r.description}
                        {r.reference && <div className="text-slate-400">{r.reference}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        {r.inQty > 0 ? <span className="num text-emerald-700 font-medium" dir="ltr">{toPersianDigits(r.inQty.toFixed(2))}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        {r.outQty > 0 ? <span className="num text-rose-700 font-medium" dir="ltr">{toPersianDigits(r.outQty.toFixed(2))}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-left">
                        <span className="num font-bold text-slate-800 text-xs" dir="ltr">{toPersianDigits(r.balance.toFixed(2))}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
