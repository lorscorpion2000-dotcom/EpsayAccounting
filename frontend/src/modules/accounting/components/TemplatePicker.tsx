import { useEffect, useState } from 'react';
import { LayoutTemplate, ChevronDown, Save, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import type { Account } from '@/types/accounting';

const KEY = 'epsay-journal-templates';

export interface JournalTemplate {
  id: string;
  name: string;
  lines: Array<{ accountId: string; description?: string; debit: number; credit: number }>;
}

function loadAll(): JournalTemplate[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function saveAll(list: JournalTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

interface Props {
  accounts: Account[];
  currentLines: Array<{ accountId: string; description?: string; debit: number; credit: number }>;
  onApply: (lines: JournalTemplate['lines']) => void;
}

export default function TemplatePicker({ accounts, currentLines, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { setTemplates(loadAll()); }, []);

  const apply = (tpl: JournalTemplate) => {
    const valid = tpl.lines.filter((l) => accounts.some((a) => a.id === l.accountId));
    if (valid.length === 0) {
      toast.error('قالب شامل حساب‌های حذف‌شده است');
      return;
    }
    onApply(valid);
    setOpen(false);
    toast.success('قالب اعمال شد');
  };

  const remove = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveAll(next);
  };

  const save = () => {
    const valid = currentLines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (valid.length === 0) { toast.error('سندی برای ذخیره وجود ندارد'); return; }
    const tpl: JournalTemplate = {
      id: Date.now().toString(),
      name: newName.trim() || 'قالب بی‌نام',
      lines: valid,
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveAll(next);
    setNewName('');
    setShowSave(false);
    toast.success('قالب ذخیره شد');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-sm"
      >
        <LayoutTemplate className="w-4 h-4" />
        قالب
        <ChevronDown className={clsx('w-3 h-3 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 start-0 z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-sm">قالب‌های من</span>
              <button
                type="button"
                onClick={() => setShowSave(true)}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> ذخیره فعلی
              </button>
            </div>

            {showSave ? (
              <div className="p-3 space-y-2 bg-amber-50">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && save()}
                  placeholder="نام قالب..."
                  className="input w-full text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={save} className="btn-primary text-xs flex-1">ذخیره</button>
                  <button onClick={() => { setShowSave(false); setNewName(''); }} className="btn-secondary text-xs">لغو</button>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                هنوز قالبی نساخته‌اید
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 border-b last:border-0 group">
                    <button
                      type="button"
                      onClick={() => apply(t)}
                      className="flex-1 text-right text-sm truncate"
                    >
                      {t.name}
                      <span className="text-xs text-slate-400 mr-2">({t.lines.length} ردیف)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
