import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, Link2, Link2Off, Search, X, CheckCircle2,
  RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import { priceListApi } from '../services/price-list.api';
import { api } from '@/services/api';
import type { PriceListItem } from '@/types/price-list';
import { WBS_UNIT_LABELS } from '@/types/price-list';
import { toPersianDigits } from '@/utils/format';

interface WbsRow {
  id: string;
  code: string;
  title: string;
  level: string;
  parentId: string | null;
  unit: string | null;
  priceListItemId: string | null;
  priceListItem: {
    id: string;
    code: string;
    description: string;
    unit: string;
    basePrice: string | number;
    priceList: { id: string; code: string; title: string; year: number };
  } | null;
}

export default function WbsBoqMapperPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [wbsRows, setWbsRows] = useState<WbsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalWbs, setModalWbs] = useState<WbsRow | null>(null);
  const [boqItems, setBoqItems] = useState<PriceListItem[]>([]);
  const [boqLoading, setBoqLoading] = useState(false);
  const [boqSearch, setBoqSearch] = useState('');
  const [selectedPriceList, setSelectedPriceList] = useState<string>('');
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [p, rows, pls] = await Promise.all([
        api.get(`/projects/${projectId}`).then((r) => r.data),
        priceListApi.wbs.projectMapping(projectId),
        priceListApi.lists.list({ status: 'PUBLISHED' }).catch(() => []),
      ]);
      setProject(p);
      setWbsRows(rows);
      setPriceLists(pls);
    } catch {
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const filtered = useMemo(() => {
    if (!search) return wbsRows;
    const s = search.toLowerCase();
    return wbsRows.filter((r) =>
      r.code.toLowerCase().includes(s) || r.title.toLowerCase().includes(s));
  }, [wbsRows, search]);

  useEffect(() => {
    if (!modalWbs) return;
    loadBoqItems();
  }, [modalWbs, selectedPriceList]);

  const loadBoqItems = async () => {
    if (!modalWbs) return;
    setBoqLoading(true);
    try {
      let listId = selectedPriceList;
      if (!listId && priceLists.length > 0) {
        listId = priceLists[0].id;
        setSelectedPriceList(listId);
      }
      if (!listId) {
        setBoqItems([]);
        return;
      }
      const items = await priceListApi.items.list(listId);
      setBoqItems(items);
    } catch {
      toast.error('خطا در بارگذاری ردیف‌ها');
    } finally {
      setBoqLoading(false);
    }
  };

  const handleSelect = async (item: PriceListItem) => {
    if (!modalWbs) return;
    setSaving(true);
    try {
      await priceListApi.wbs.link(modalWbs.id, item.id);
      toast.success('اتصال ثبت شد');
      setModalWbs(null);
      setBoqSearch('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (row: WbsRow) => {
    if (!confirm(`آیا می‌خواهید اتصال «${row.title}» را قطع کنید؟`)) return;
    try {
      await priceListApi.wbs.link(row.id, null);
      toast.success('اتصال قطع شد');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    }
  };

  const filteredBoq = useMemo(() => {
    if (!boqSearch) return boqItems;
    const s = boqSearch.toLowerCase();
    return boqItems.filter((it) =>
      it.code.toLowerCase().includes(s) || it.description.toLowerCase().includes(s));
  }, [boqItems, boqSearch]);

  const stats = useMemo(() => {
    const total = wbsRows.length;
    const linked = wbsRows.filter((r) => r.priceListItemId).length;
    return { total, linked, unlinked: total - linked };
  }, [wbsRows]);

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/projects')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> پروژه‌ها
        </button>
        <span>/</span>
        <span>{project?.name}</span>
        <span>/</span>
        <span className="text-slate-800 font-medium">اتصال فهرست بها</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-brand-600" />
            اتصال فهرست بها (BOQ) به WBS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            هر ردیف WBS را به یک ردیف فهرست بها متصل کنید
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> بروزرسانی
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">تعداد WBS</div>
          <div className="text-2xl font-bold num mt-1">{toPersianDigits(stats.total)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">متصل‌شده</div>
          <div className="text-2xl font-bold num mt-1 text-emerald-600">{toPersianDigits(stats.linked)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">بدون اتصال</div>
          <div className="text-2xl font-bold num mt-1 text-amber-600">{toPersianDigits(stats.unlinked)}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در کد یا عنوان WBS..." className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {search ? 'ردیفی یافت نشد' : 'این پروژه WBS ندارد'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-32">کد WBS</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">عنوان</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">واحد</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 w-80">ردیف فهرست بها</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-28">وضعیت</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 w-32">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="num text-xs font-mono text-brand-700 font-bold" dir="ltr">{r.code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 text-xs">
                      <div>{r.title}</div>
                      <div className="text-slate-400 text-[10px]">{r.level}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {r.unit ? WBS_UNIT_LABELS[r.unit as keyof typeof WBS_UNIT_LABELS] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.priceListItem ? (
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="num font-mono font-bold text-emerald-700" dir="ltr">
                              {r.priceListItem.code}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              ({r.priceListItem.priceList.code})
                            </span>
                          </div>
                          <div className="text-slate-600 mt-0.5 truncate max-w-md">
                            {r.priceListItem.description}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">— متصل نشده —</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.priceListItem ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> متصل
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                          بدون BOQ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setModalWbs(r); setBoqSearch(''); }}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600"
                          title={r.priceListItem ? 'تغییر' : 'اتصال'}
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        {r.priceListItem && (
                          <button
                            onClick={() => handleUnlink(r)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            title="قطع اتصال"
                          >
                            <Link2Off className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalWbs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  انتخاب ردیف فهرست بها
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  برای WBS: <span className="num font-mono" dir="ltr">{modalWbs.code}</span> — {modalWbs.title}
                </p>
              </div>
              <button onClick={() => setModalWbs(null)} className="p-2 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-3 border-b bg-slate-50 flex items-center gap-3 flex-wrap">
              <select
                value={selectedPriceList}
                onChange={(e) => setSelectedPriceList(e.target.value)}
                className="input text-sm w-64"
              >
                <option value="">— همه فهرست‌ها —</option>
                {priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title} ({pl.code})
                  </option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={boqSearch} onChange={(e) => setBoqSearch(e.target.value)}
                  placeholder="جستجو در کد یا شرح..." className="input ps-10 pe-4 w-full text-sm" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {boqLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : filteredBoq.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  {priceLists.length === 0
                    ? 'هیچ فهرست بهای منتشرشده‌ای وجود ندارد. ابتدا یک فهرست بسازید و منتشر کنید.'
                    : 'ردیفی یافت نشد'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="text-right px-4 py-2 w-32 font-medium text-slate-600">کد (ش.ف)</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">شرح</th>
                      <th className="text-center px-4 py-2 w-24 font-medium text-slate-600">واحد</th>
                      <th className="text-left px-4 py-2 w-32 font-medium text-slate-600">بهای واحد</th>
                      <th className="text-center px-4 py-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBoq.map((item) => (
                      <tr key={item.id} className="hover:bg-brand-50/30 cursor-pointer"
                        onClick={() => !saving && handleSelect(item)}>
                        <td className="px-4 py-2">
                          <span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">{item.code}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-xs">{item.description}</td>
                        <td className="px-4 py-2 text-center text-xs text-slate-500">
                          {WBS_UNIT_LABELS[item.unit] || item.unit}
                        </td>
                        <td className="px-4 py-2 text-left num text-xs">
                          {toPersianDigits(Number(item.basePrice).toLocaleString())}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelect(item); }}
                            disabled={saving}
                            className="btn-primary text-xs py-1 px-2"
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'انتخاب'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {toPersianDigits(filteredBoq.length)} ردیف
              </span>
              <button onClick={() => setModalWbs(null)} className="btn-secondary text-sm">بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}