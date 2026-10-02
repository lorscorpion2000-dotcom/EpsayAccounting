import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function CancelDialog({ isOpen, title, message, loading, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleClose = () => { setReason(''); onCancel(); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">{message}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input w-full resize-none"
            placeholder="دلیل ابطال..."
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
          <button onClick={handleClose} className="btn-secondary">انصراف</button>
          <button
            onClick={() => { onConfirm(reason); setReason(''); }}
            disabled={loading || !reason.trim()}
            className="btn-danger"
          >
            {loading ? 'در حال ابطال...' : 'ابطال'}
          </button>
        </div>
      </div>
    </div>
  );
}
