import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, Upload, Download, FileSpreadsheet, AlertCircle,
  CheckCircle2, Users, Package, Layers, FolderTree, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { dataIoApi } from '../services/data-io.api';
import { api } from '@/services/api';
import type { ImportResult, DataType } from '@/types/data-io';
import { DATA_TYPE_LABELS } from '@/types/data-io';
import { toPersianDigits } from '@/utils/format';

const TYPE_ICONS: Record<DataType, any> = {
  partners: Users, items: Package, wbs: Layers, accounts: FolderTree,
};

const TEMPLATES: Record<DataType, string[][]> = {
  partners: [
    ['code', 'name', 'type', 'fatherName', 'nationalId', 'phone', 'email', 'postalCode', 'address', 'isActive'],
    ['P-0001', 'شرکت نمونه', 'CLIENT', '', '1234567890', '09120000000', '', '', '', 'true'],
    ['P-0002', 'آقای نمونه', 'SUPPLIER', 'علی', '', '', '', '', '', 'true'],
  ],
  items: [
    ['code', 'name', 'type', 'unit', 'categoryCode', 'minStock', 'maxStock', 'reorderPoint', 'isActive'],
    ['I-0001', 'سیمان تیپ ۲', 'MATERIAL', 'KILOGRAM', '', '100', '10000', '500', 'true'],
    ['I-0002', 'میلگرد A3 ۱۶', 'MATERIAL', 'KILOGRAM', '', '500', '20000', '1000', 'true'],
  ],
  wbs: [
    ['projectCode', 'code', 'title', 'level', 'parentCode', 'unit', 'quantity', 'unitPrice', 'sortOrder', 'description'],
    ['PRJ-2026-001', '1', 'فاز ۱', 'PHASE', '', '', '', '', '1', ''],
    ['PRJ-2026-001', '1.1', 'خاکبرداری', 'ACTIVITY', '1', 'CUBIC_METER', '500', '250000', '2', ''],
  ],
  accounts: [
    ['code', 'name', 'level', 'nature', 'parentCode', 'isPostable', 'isActive'],
    ['1', 'دارایی‌ها', 'GROUP', 'DEBIT', '', 'false', 'true'],
    ['1.1', 'دارایی جاری', 'GENERAL', 'DEBIT', '1', 'false', 'true'],
    ['1.1.1', 'نقد و بانک', 'SUBSIDIARY', 'DEBIT', '1.1', 'true', 'true'],
  ],
};

export default function DataIoPage() {
  const [activeType, setActiveType] = useState<DataType>('partners');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);
  }, []);

  // ─── Export ───
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = activeType === 'wbs' && selectedProject ? { projectId: selectedProject } : undefined;
      const data = await dataIoApi.exportData(activeType, params);
      if (!data || data.length === 0) {
        toast.error('داده‌ای برای خروجی وجود ندارد');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      const fname = activeType + '-' + new Date().toISOString().slice(0, 10) + '.xlsx';
      XLSX.writeFile(wb, fname);
      toast.success('فایل خروجی دانلود شد');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در خروجی');
    } finally { setExporting(false); }
  };

  // ─── Download Template ───
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet(TEMPLATES[activeType]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, activeType + '-template.xlsx');
    toast.success('قالب دانلود شد');
  };

  // ─── File Read ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (json.length === 0) { toast.error('فایل خالی است'); return; }
      setPreviewRows(json);
      setImportResult(null);
    } catch (err: any) {
      toast.error('خطا در خواندن فایل: ' + (err?.message || ''));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Import ───
  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    try {
      const result = await dataIoApi.importData(activeType, previewRows);
      setImportResult(result);
      toast.success(`${result.created + result.updated} ردیف اعمال شد`);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ورود');
    } finally { setImporting(false); }
  };

  const reset = () => {
    setPreviewRows([]);
    setImportResult(null);
  };

  const TYPES: DataType[] = ['partners', 'items', 'wbs', 'accounts'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            ورود و خروج داده‌های پایه
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            خروج داده‌های موجود یا ورود دسته‌ای از فایل اکسل
          </p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button key={t} type="button" onClick={() => { setActiveType(t); reset(); }}
                className={clsx(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeType === t
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}>
                <Icon className="w-4 h-4" />
                {DATA_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-slate-600">
            نوع: <span className="font-bold">{DATA_TYPE_LABELS[activeType]}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeType === 'wbs' && (
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="input text-sm w-64">
                <option value="">همه پروژه‌ها</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button type="button" onClick={handleDownloadTemplate} className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> دانلود قالب
            </button>
            <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary text-sm">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              خروجی اکسل موجود
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-primary text-sm">
              <Upload className="w-4 h-4" /> انتخاب فایل برای ورود
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-1">نکات مهم ورود داده</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>ردیف‌ها با کد یکسان <strong>به‌روزرسانی</strong> می‌شوند (نه تکراری).</li>
              <li>ستون‌های لازم را از «دانلود قالب» ببینید.</li>
              <li>نوع اشخاص: CLIENT | CONSULTANT | CONTRACTOR | SUPPLIER | EMPLOYEE | PARTNER | OTHER</li>
              <li>نوع کالا: CONSUMABLE | CAPITAL | MATERIAL</li>
              <li>واحد: KILOGRAM, TON, NUMBER, CUBIC_METER, SQUARE_METER, ...</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview / Result */}
      {previewRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              {importResult ? 'نتیجه ورود' : `پیش‌نمایش (${toPersianDigits(previewRows.length)} ردیف)`}
            </h2>
            {!importResult && (
              <div className="flex items-center gap-2">
                <button onClick={reset} className="btn-secondary text-sm">انصراف</button>
                <button onClick={handleImport} disabled={importing} className="btn-primary text-sm">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  ورود {toPersianDigits(previewRows.length)} ردیف
                </button>
              </div>
            )}
            {importResult && (
              <button onClick={reset} className="btn-secondary text-sm">بستن</button>
            )}
          </div>

          {importResult && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border text-center">
                  <div className="text-xs text-slate-500">کل</div>
                  <div className="text-xl font-bold num">{toPersianDigits(importResult.total)}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> جدید
                  </div>
                  <div className="text-xl font-bold num text-emerald-700">{toPersianDigits(importResult.created)}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <div className="text-xs text-blue-600">به‌روزرسانی</div>
                  <div className="text-xl font-bold num text-blue-700">{toPersianDigits(importResult.updated)}</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 max-h-64 overflow-y-auto">
                  <div className="flex items-center gap-2 text-red-700 font-bold mb-2 text-sm">
                    <XCircle className="w-4 h-4" /> خطاها ({toPersianDigits(importResult.errors.length)})
                  </div>
                  <ul className="text-xs space-y-1">
                    {importResult.errors.slice(0, 50).map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="num font-mono shrink-0">ردیف {toPersianDigits(e.row)}:</span>
                        <span className="text-red-700">{e.error}</span>
                      </li>
                    ))}
                    {importResult.errors.length > 50 && (
                      <li className="text-slate-400">... و {toPersianDigits(importResult.errors.length - 50)} خطای دیگر</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!importResult && (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr>
                    <th className="text-center px-2 py-2 w-10">#</th>
                    {Object.keys(previewRows[0] || {}).slice(0, 8).map((k) => (
                      <th key={k} className="text-right px-2 py-2 font-medium text-slate-600" dir="ltr">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                      {Object.keys(previewRows[0] || {}).slice(0, 8).map((k) => (
                        <td key={k} className="px-2 py-1 text-slate-700 truncate max-w-[200px]" dir="ltr">
                          {String(r[k] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 100 && (
                <div className="px-3 py-2 bg-slate-50 text-center text-xs text-slate-500">
                  ... و {toPersianDigits(previewRows.length - 100)} ردیف دیگر
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
