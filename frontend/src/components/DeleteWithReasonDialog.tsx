import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import type { DeleteWithReasonDialogProps } from '@/types/soft-delete';

const PRESET_REASONS = [
  'ورود اشتباهی',
  'داده تکراری',
  'تست و توسعه',
  'اصلاح خطا',
  'درخواست مدیر',
  'سایر',
];

export default function DeleteWithReasonDialog(props: DeleteWithReasonDialogProps) {
  const {
    isOpen,
    title = 'حذف رکورد',
    itemLabel,
    onConfirm,
    onCancel,
    loading = false,
    danger = true,
  } = props;

  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setCustomReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const finalReason = reason === 'سایر' ? customReason : reason;
  const canConfirm = finalReason.trim().length >= 3 && !loading;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(finalReason.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className={clsx(
          'px-6 py-4 border-b flex items-center justify-between',
          danger ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200',
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              danger ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-700',
            )}>
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className={clsx('text-lg font-bold', danger ? 'text-red-800' : 'text-slate-800')}>
              {title}
            </h3>
          </div>
          <button onClick={onCancel} disabled={loading}
            className="p-2 rounded-lg hover:bg-white/70 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {itemLabel && (
            <div className="text-sm text-slate-600">
              مورد انتخاب‌شده: <span className="font-bold num" dir="ltr">{itemLabel}</span>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-5">
              این رکورد از لیست‌ها پنهان می‌شود. مدیر ارشد می‌تواند از طریق «سوابق حذف» بازیابی کند.
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              دلیل حذف <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PRESET_REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} disabled={loading}
                  className={clsx(
                    'px-2 py-1.5 text-xs rounded-lg border transition-colors',
                    reason === r
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
                  )}>
                  {r}
                </button>
              ))}
            </div>

            {reason === 'سایر' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={loading}
                placeholder="دلیل خود را بنویسید (حداقل ۳ کاراکتر)..."
                className="input w-full text-sm resize-none"
              />
            )}
            {reason && reason !== 'سایر' && (
              <div className="text-xs text-slate-500 mt-1">
                دلیل انتخابی: <span className="font-medium text-slate-700">{reason}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">انصراف</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            className={clsx(
              'btn text-white flex items-center gap-2',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700',
              !canConfirm && 'opacity-50 cursor-not-allowed',
            )}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال حذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                تأیید حذف
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
