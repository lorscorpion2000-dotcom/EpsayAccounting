// E:\EpsayAccounting\frontend\src\components\PrintButtonWithHint.tsx
import { useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Info, X } from 'lucide-react';

interface Props {
  contentRef: React.RefObject<HTMLDivElement>;
  documentTitle?: string;
  className?: string;
  label?: string;
}

export default function PrintButtonWithHint({
  contentRef,
  documentTitle = 'گزارش',
  className = 'btn-secondary',
  label = 'چاپ',
}: Props) {
  const [showHint, setShowHint] = useState(false);

  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle,
    pageStyle: `
      @page { size: A4; margin: 1cm 0.8cm; }
      @media print {
        html, body {
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: "Vazirmatn", Tahoma, sans-serif !important;
          direction: rtl !important;
        }
        .no-print { display: none !important; }
        .card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
        table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
        table th, table td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; }
        table thead th {
          background: #7C3AED !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * { box-shadow: none !important; }
      }
    `,
  });

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setShowHint(true)}
      >
        <Printer className="w-4 h-4" />
        {label}
      </button>

      {showHint && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">راهنمای چاپ تمیز</h3>
                  <p className="text-sm text-slate-600">
                    برای چاپ فقط گزارش (بدون هدر و فوتر مرورگر):
                  </p>
                </div>
                <button onClick={() => setShowHint(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-700 space-y-3">
                <div>
                  <div className="font-bold text-slate-800 mb-1">Chrome / Edge:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                    <li>در پنجره چاپ روی <b>More settings</b> کلیک کنید</li>
                    <li>گزینه <b>Headers and footers</b> را <b>خاموش</b> کنید</li>
                  </ol>
                </div>
                <div>
                  <div className="font-bold text-slate-800 mb-1">Firefox:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                    <li>در پنجره چاپ روی <b>Options</b> کلیک کنید</li>
                    <li><b>Headers and Footers</b> را روی <b>Blank</b> بگذارید</li>
                  </ol>
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                  ⚠️ این تنظیم در هر بار چاپ باید تکرار شود و از سمت نرم‌افزار قابل کنترل نیست.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowHint(false)} className="btn-secondary">
                  انصراف
                </button>
                <button
                  onClick={() => { setShowHint(false); handlePrint(); }}
                  className="btn-primary"
                >
                  <Printer className="w-4 h-4" />
                  ادامه چاپ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
