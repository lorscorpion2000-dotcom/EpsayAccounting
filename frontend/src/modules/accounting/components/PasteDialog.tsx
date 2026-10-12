import { useState } from 'react';
import { X, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import type { Account } from '@/types/accounting';

interface Props {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onImport: (rows: Array<{ accountCode: string; description: string; debit: number; credit: number }>) => void;
}

export default function PasteDialog({ open, accounts: _accounts, onClose, onImport }: Props) {
  const [text, setText] = useState('');

  if (!open) return null;

  const handleImport = () => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) { toast.error('چیزی paste نشده'); return; }

    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(/\t/).map((s) => s.trim());
      if (cols.length < 2) { errors.push('خط ' + (i + 1) + ': ستون کافی نیست'); continue; }
      const accountCode = cols[0];
      const description = cols[1] || '';
      const debit = parseFloat((cols[2] || '0').replace(/,/g, '')) || 0;
      const credit = parseFloat((cols[3] || '0').replace(/,/g, '')) || 0;
      rows.push({ accountCode, description, debit, credit });
    }

    if (errors.length) { toast.error(errors[0]); return; }
    onImport(rows);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold">ورود گروهی از Excel</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-bold mb-1">راهنما:</p>
            <p>از Excel یک جدول با ۴ ستون کپی کنید:</p>
            <p className="font-mono mt-1" dir="ltr">کد حساب | شرح | بدهکار | بستانکار</p>
            <p className="mt-2">مثال:</p>
            <div className="bg-white p-2 mt-1 rounded font-mono text-xs" dir="ltr">
              <div>1.1.1 &rarr; دریافت نقد &rarr; 1000000 &rarr; 0</div>
              <div>4.1.1 &rarr; فروش &rarr; 0 &rarr; 1000000</div>
            </div>
          </div>

          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اینجا paste کنید (Ctrl+V)..."
            rows={10}
            className="input w-full font-mono text-sm"
            dir="ltr"
          />
        </div>

        <div className="flex justify-end gap-2 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleImport} disabled={!text.trim()} className="btn-primary">
            وارد کن
          </button>
        </div>
      </div>
    </div>
  );
}
