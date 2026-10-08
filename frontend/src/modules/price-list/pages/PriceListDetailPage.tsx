import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Loader2, BookOpen, Plus, Trash2, Search,
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2,
  RefreshCw, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { priceListApi } from '../services/price-list.api';
import type {
  PriceList, PriceListItem, CreatePriceListItemPayload,
  WbsUnit, ImportResult,
} from '@/types/price-list';
import {
  PRICE_LIST_STATUS_LABELS, PRICE_LIST_STATUS_COLORS,
  WBS_UNIT_LABELS,
} from '@/types/price-list';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ExcelRow {
  code: string;
  description: string;
  unit: string;
  basePrice: number;
  category?: string;
  chapter?: string;
}

const UNIT_MAP: Record<string, WbsUnit> = {
  'متر مربع': 'SQUARE_METER', 'مترمربع': 'SQUARE_METER', 'م۲': 'SQUARE_METER',
  'متر مکعب': 'CUBIC_METER', 'مترمکعب': 'CUBIC_METER', 'م۳': 'CUBIC_METER',
  'متر طول': 'LINEAR_METER', 'متر': 'LINEAR_METER',
  'تن': 'TON', 'کیلوگرم': 'KILOGRAM', 'کیلو': 'KILOGRAM',
  'عدد': 'NUMBER', 'سرویس': 'SERVICE', 'مقطوع': 'LUMP',
};

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pl, setPl] = useState<PriceList | null>(null);
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionItem, setActionItem] = useState<PriceListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ExcelRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Add form
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUnit, setNewUnit] = useState<WbsUnit>('NUMBER');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newChapter, setNewChapter] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [data, its] = await Promise.all([
        priceListApi.lists.get(id),
        priceListApi.items.list(id),
      ]);
      setPl(data);
      setItems(its);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((it) =>
      it.code.toLowerCase().includes(s) ||
      it.description.toLowerCase().includes(s) ||
      it.chapter?.toLowerCase().includes(s));
  }, [items, search]);

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await priceListApi.items.remove(actionItem.id);
      toast.success('حذف شد');
      setActionItem(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا');
    } finally { setActionLoading(false); }
  };

  const handleAdd = async () => {
    if (!id || !newCode.trim() || !newDesc.trim()) {
      toast.error('کد و شرح الزامی است');
      return;
    }
    setActionLoading(true);
    try {
      await priceListApi.items.create(id, {
        code: newCode.trim(),
        description: newDesc.trim(),
        unit: newUnit,
        basePrice: newPrice,
        chapter: newChapter.trim() || undefined,
      });
      toast.success('ردیف اضافه شد');
      setShowAdd(false);
      setNewCode(''); setNewDesc(''); setNewUnit('NUMBER'); setNewPrice(0); setNewChapter('');
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setActionLoading(false); }
  };

  // ═══ Excel ═══
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });

      let headerIdx = 0;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = rows[i]?.map((c: any) => String(c).trim());
        if (r?.some((c: any) => /کد|code/i.test(c))) { headerIdx = i; break; }
      }

      const header = (rows[headerIdx] as any[]).map((c) => String(c).trim());
      const dataRows = rows.slice(headerIdx + 1);

      const codeIdx = header.findIndex((h) => /کد|code/i.test(h));
      const descIdx = header.findIndex((h) => /شرح|description|عملیات/i.test(h));
      const unitIdx = header.findIndex((h) => /واحد|unit/i.test(h));
      const priceIdx = header.findIndex((h) => /بها|قیمت|price/i.test(h));
      const chapIdx = header.findIndex((h) => /فصل|chapter/i.test(h));

      if (codeIdx < 0 || descIdx < 0) {
        toast.error('ستون «کد» یا «شرح» در فایل یافت نشد');
        return;
      }

      const parsed: ExcelRow[] = [];
      for (const r of dataRows) {
        const code = String(r[codeIdx] ?? '').trim();
        const description = String(r[descIdx] ?? '').trim();
        if (!code && !description) continue;
        const unitRaw = unitIdx >= 0 ? String(r[unitIdx] ?? '').trim() : '';
        const priceRaw = priceIdx >= 0 ? r[priceIdx] : 0;
        parsed.push({
          code,
          description,
          unit: unitRaw,
          basePrice: typeof priceRaw === 'number' ? priceRaw : Number(String(priceRaw).replace(/[^\d.-]/g, '')) || 0,
          chapter: chapIdx >= 0 ? String(r[chapIdx] ?? '').trim() : undefined,
        });
      }

      if (parsed.length === 0) {
        toast.error('هیچ ردیفی برای ورود پیدا نشد');
        return;
      }

      setImportPreview(parsed);
      setImportResult(null);
      setShowImport(true);
    } catch (err: any) {
      toast.error('خطا در خواندن فایل: ' + (err?.message || ''));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!id || importPreview.length === 0) return;
    setImportLoading(true);
    try {
      const payload: CreatePriceListItemPayload[] = importPreview.map((r, i) => ({
        code: r.code,
        description: r.description,
        unit: UNIT_MAP[r.unit] || 'NUMBER',
        basePrice: r.basePrice,
        chapter: r.chapter,
        sortOrder: i,
      }));

      const result = await priceListApi.items.import(id, payload);
      setImportResult(result);
      toast.success(`${result.created} ردیف اضافه شد`);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ورود');
    } finally { setImportLoading(false); }
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['کد', 'شرح', 'واحد', 'بهای واحد', 'فصل'],
      ['321', 'تهیه و اجرای بتن مگر', 'متر مکعب', 5000000, 'فصل ۳'],
      ['322', 'قالب‌بندی فلزی', 'متر مربع', 3500000, 'فصل ۳'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'price-list-template.xlsx');
    toast.success('قالب دانلود شد');
  };

  if (loading) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!pl) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button onClick={() => navigate('/price-lists')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> فهرست بها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">{pl.code}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{pl.title}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', PRICE_LIST_STATUS_COLORS[pl.status])}>
                  {PRICE_LIST_STATUS_LABELS[pl.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num text-xs font-mono" dir="ltr">{pl.code}</span>
                <span className="text-slate-300">•</span>
                <span>سال {toPersianDigits(pl.year)}</span>
                <span className="text-slate-300">•</span>
                <span>از {formatJalaliDate(pl.effectiveFrom)}</span>
                {pl.effectiveTo && <><span className="text-slate-300">•</span><span>تا {formatJalaliDate(pl.effectiveTo)}</span></>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print flex-wrap">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
            <button className="btn-secondary text-sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4" /> قالب اکسل
            </button>
            <button className="btn-secondary text-sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> ورود از اکسل
            </button>
            <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> ردیف جدید
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در کد، شرح، فصل..." className="input ps-10 pe-4 w-full" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
          <div className="font-bold text-slate-700 text-sm">
            {toPersianDigits(filtered.length)} ردیف
            {search && <span className="text-slate-400 font-normal ms-2">(از {toPersianDigits(items.length)})</span>}
          </div>
          <button className="text-xs text-slate-500 hover:text-brand-600" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {search ? 'ردیفی با این جستجو یافت نشد' : 'هیچ ردیفی ثبت نشده است'}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b sticky top-0">
                <tr>
                  <th className="text-center px-3 py-2 w-12 font-medium text-slate-600">#</th>
                  <th className="text-right px-3 py-2 w-32 font-medium text-slate-600">کد (ش.ف)</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">شرح</th>
                  <th className="text-center px-3 py-2 w-24 font-medium text-slate-600">واحد</th>
                  <th className="text-left px-3 py-2 w-40 font-medium text-slate-600">بهای واحد (ریال)</th>
                  <th className="text-right px-3 py-2 w-28 font-medium text-slate-600">فصل</th>
                  <th className="text-center px-3 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                    <td className="px-3 py-2">
                      <span className="num text-xs font-mono font-bold text-brand-700" dir="ltr">{it.code}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-xs">{it.description}</td>
                    <td className="px-3 py-2 text-center text-xs text-slate-500">{WBS_UNIT_LABELS[it.unit]}</td>
                    <td className="px-3 py-2 text-left num text-xs font-bold">
                      {toPersianDigits(Number(it.basePrice).toLocaleString())}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{it.chapter || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setActionItem(it)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">ردیف جدید فهرست بها</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">کد (ش.ف) *</label>
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)}
                    className="input num" dir="ltr" placeholder="321" autoFocus />
                </div>
                <div>
                  <label className="label text-xs">واحد</label>
                  <select value={newUnit} onChange={(e) => setNewUnit(e.target.value as WbsUnit)} className="input">
                    {Object.entries(WBS_UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-xs">شرح *</label>
                <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">بهای واحد (ریال)</label>
                  <input type="number" value={newPrice || ''} onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="input num" dir="ltr" />
                </div>
                <div>
                  <label className="label text-xs">فصل</label>
                  <input type="text" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} className="input" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">انصراف</button>
              <button onClick={handleAdd} disabled={actionLoading} className="btn-primary">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                افزودن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                ورود از اکسل — {toPersianDigits(importPreview.length)} ردیف شناسایی شد
              </h3>
              <button onClick={() => { setShowImport(false); setImportPreview([]); setImportResult(null); }}
                className="p-2 rounded hover:bg-slate-100">
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
                    <CheckCircle2 className="w-5 h-5" /> نتیجه ورود
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-slate-600 text-xs">کل ردیف‌ها</div>
                      <div className="font-bold num">{toPersianDigits(importResult.total)}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 text-xs">اضافه‌شده</div>
                      <div className="font-bold num text-emerald-700">{toPersianDigits(importResult.created)}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 text-xs">رد‌شده</div>
                      <div className="font-bold num text-amber-700">{toPersianDigits(importResult.skipped)}</div>
                    </div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 max-h-60 overflow-y-auto">
                    <div className="flex items-center gap-2 text-amber-700 font-bold mb-2 text-sm">
                      <AlertCircle className="w-4 h-4" /> ردیف‌های رد‌شده
                    </div>
                    <ul className="text-xs space-y-1">
                      {importResult.errors.slice(0, 50).map((e, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="num font-mono">ردیف {e.row}</span>
                          <span className="text-slate-600">({e.code})</span>
                          <span className="text-amber-700">{e.reason}</span>
                        </li>
                      ))}
                      {importResult.errors.length > 50 && (
                        <li className="text-slate-400">... و {toPersianDigits(importResult.errors.length - 50)} مورد دیگر</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowImport(false); setImportPreview([]); setImportResult(null); }}
                    className="btn-primary">بستن</button>
                </div>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden mb-4">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="text-center px-2 py-2 w-10">#</th>
                          <th className="text-right px-2 py-2 w-24">کد</th>
                          <th className="text-right px-2 py-2">شرح</th>
                          <th className="text-center px-2 py-2 w-20">واحد</th>
                          <th className="text-left px-2 py-2 w-32">بهای واحد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 100).map((r, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                            <td className="px-2 py-1 num font-mono" dir="ltr">{r.code}</td>
                            <td className="px-2 py-1 text-slate-700">{r.description}</td>
                            <td className="px-2 py-1 text-center text-slate-500">{r.unit || '—'}</td>
                            <td className="px-2 py-1 text-left num">{toPersianDigits(r.basePrice.toLocaleString())}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 100 && (
                      <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-500">
                        ... و {toPersianDigits(importPreview.length - 100)} ردیف دیگر
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowImport(false); setImportPreview([]); }}
                    disabled={importLoading} className="btn-secondary">انصراف</button>
                  <button onClick={handleImport} disabled={importLoading} className="btn-primary">
                    {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    ورود {toPersianDigits(importPreview.length)} ردیف
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!actionItem}
        title="حذف ردیف"
        message={actionItem ? `آیا از حذف ردیف «${actionItem.code}» اطمینان دارید؟` : ''}
        confirmLabel="بله، حذف کن"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setActionItem(null)}
      />
    </div>
  );
}