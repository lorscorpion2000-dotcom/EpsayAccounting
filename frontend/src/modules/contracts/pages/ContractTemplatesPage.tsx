import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, FileText, RefreshCw, Printer, Download } from 'lucide-react';
import { exportHtmlToWord, printHtmlInNewWindow } from '@/utils/word-export';
import clsx from 'clsx';
import { contractsApi, LegalContractKind } from '../services/contracts.api';

const KIND_LABELS: Record<LegalContractKind, string> = {
  WORKER_EMPLOYMENT: 'قرارداد کارگری',
  CONTRACTOR_AGREEMENT: 'قرارداد پیمانکاری',
  CLIENT_CONTRACT: 'قرارداد کارفرمایی',
  SUBCONTRACTOR: 'پیمانکار جزء',
};

export default function ContractTemplatesPage() {
  const [activeKind, setActiveKind] = useState<LegalContractKind>('WORKER_EMPLOYMENT');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async (kind: LegalContractKind) => {
    setLoading(true);
    try {
      const tpl = await contractsApi.getTemplate(kind);
      setTitle(tpl?.title || KIND_LABELS[kind]);
      setBodyHtml(tpl?.bodyHtml || '');
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(activeKind); }, [activeKind]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await contractsApi.upsertTemplate(activeKind, { title, bodyHtml });
      toast.success('ذخیره شد');
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  const handleRefresh = () => load(activeKind);


  const handleWordExport = () => {
    if (!bodyHtml.trim()) { toast.error('متنی برای خروجی وجود ندارد'); return; }
    exportHtmlToWord({
      filename: 'قالب-' + KIND_LABELS[activeKind],
      title: title || KIND_LABELS[activeKind],
      subtitle: 'قالب قرارداد',
      bodyHtml: bodyHtml,
    });
    toast.success('فایل Word دانلود شد');
  };

  const handlePrint = () => {
    if (!bodyHtml.trim()) { toast.error('متنی برای چاپ وجود ندارد'); return; }
    printHtmlInNewWindow(
      title || KIND_LABELS[activeKind],
      '<h1>' + (title || KIND_LABELS[activeKind]) + '</h1>' + bodyHtml,
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-600" />
            قالبهای قرارداد
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            متن آماده هر نوع قرارداد را اینجا یکبار ذخیره کنید — در فرم قرارداد جدید با یک کلیک قابل بارگذاری است
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handlePrint} disabled={loading} title="چاپ">
            <Printer className="w-4 h-4" />
          </button>
          <button className="btn-secondary" onClick={handleWordExport} disabled={loading} title="خروجی Word">
            <Download className="w-4 h-4" /> Word
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.keys(KIND_LABELS) as LegalContractKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className={clsx(
              'py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium',
              activeKind === k
                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            )}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">عنوان قالب</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                متن قالب (HTML)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                میتوانید متن ساده بنویسید یا از تگهای HTML برای تیتر بولد و پاراگراف استفاده کنید
              </p>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={22}
                className="input w-full resize-none font-mono text-xs leading-6"
                placeholder="مثال:&#10;<h2>ماده ۱ - طرفین قرارداد</h2>&#10;<p>این قرارداد فیمابین ...</p>"
                dir="rtl"
              />
            </div>
            <div className="text-xs text-slate-500">
              طول متن: {bodyHtml.length.toLocaleString('fa-IR')} کاراکتر
            </div>
          </>
        )}
      </div>
    </div>
  );
}
