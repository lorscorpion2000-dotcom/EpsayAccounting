import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) AccountSelect.tsx — کامپوننت جستجوی حساب
// ═══════════════════════════════════════════════════════════════
const comp = `import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Account } from '@/types/accounting';

interface Props {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  loading?: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  GROUP: 'گروه',
  GENERAL: 'کل',
  SUBSIDIARY: 'معین',
  TAFZIL: 'تفصیلی',
};

const LEVEL_COLORS: Record<string, string> = {
  GROUP: 'bg-slate-100 text-slate-700',
  GENERAL: 'bg-blue-100 text-blue-700',
  SUBSIDIARY: 'bg-emerald-100 text-emerald-700',
  TAFZIL: 'bg-violet-100 text-violet-700',
};

export default function AccountSelect({
  accounts,
  value,
  onChange,
  placeholder = 'جستجوی حساب...',
  disabled = false,
  hasError = false,
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // پیدا کردن حساب انتخاب‌شده
  const selected = useMemo(() => accounts.find((a) => a.id === value), [accounts, value]);

  // فیلتر
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts.slice(0, 100);
    return accounts.filter((a) => {
      const code = (a.code || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return code.includes(term) || name.includes(term);
    }).slice(0, 100);
  }, [accounts, search]);

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // اسکرول به highlight
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-idx="' + highlightIdx + '"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  // فوکوس روی input وقتی باز شد
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) { setSearch(''); setHighlightIdx(0); }
  }, [open]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIdx]) {
        onChange(filtered[highlightIdx].id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* دکمه نمایش مقدار */}
      <div
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKey}
        tabIndex={disabled ? -1 : 0}
        className={clsx(
          'input w-full flex items-center justify-between gap-2 cursor-pointer text-sm',
          disabled && 'opacity-60 cursor-not-allowed',
          hasError && 'border-red-400',
          open && 'ring-2 ring-brand-500/30 border-brand-500',
        )}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="num font-mono text-xs text-slate-500 shrink-0" dir="ltr">
              {selected.code}
            </span>
            <span className="truncate">{selected.name}</span>
            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded shrink-0', LEVEL_COLORS[selected.level] || 'bg-slate-100')}>
              {LEVEL_LABELS[selected.level] || selected.level}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={clsx('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 start-0 end-0 z-50 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search */}
          <div className="relative border-b">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
              onKeyDown={handleKey}
              placeholder="کد یا نام حساب..."
              className="w-full ps-10 pe-4 py-2.5 text-sm border-0 focus:outline-none focus:ring-0"
            />
          </div>

          {/* List */}
          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {search ? 'حسابی پیدا نشد' : 'هیچ حسابی وجود ندارد'}
              </div>
            ) : (
              filtered.map((a, idx) => {
                const isActive = idx === highlightIdx;
                const isSelected = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    data-idx={idx}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onClick={() => { onChange(a.id); setOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-right transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50',
                      isSelected && 'font-bold',
                    )}
                  >
                    <span className="num font-mono text-xs text-slate-500 w-24 shrink-0 text-left" dir="ltr">
                      {a.code}
                    </span>
                    <span className="flex-1 truncate">{a.name}</span>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded shrink-0', LEVEL_COLORS[a.level] || 'bg-slate-100')}>
                      {LEVEL_LABELS[a.level] || a.level}
                    </span>
                  </button>
                );
              })
            )}
            {filtered.length === 100 && (
              <div className="px-3 py-2 text-xs text-slate-400 text-center border-t bg-slate-50">
                نمایش ۱۰۰ مورد اول — برای نتیجه دقیق‌تر جستجو کنید
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/components/AccountSelect.tsx', comp, 'utf8');
console.log('OK AccountSelect.tsx');

// ═══════════════════════════════════════════════════════════════
// 2) پچ JournalFormPage
// ═══════════════════════════════════════════════════════════════
const jPath = ROOT + '/frontend/src/modules/accounting/pages/JournalFormPage.tsx';
let j = fs.readFileSync(jPath, 'utf8');
let changed = 0;

// 2.a) import
if (!j.includes('AccountSelect')) {
  j = j.replace(
    "import { PersianDatePicker } from '@/components/PersianDatePicker';",
    "import { PersianDatePicker } from '@/components/PersianDatePicker';\nimport AccountSelect from '../components/AccountSelect';"
  );
  changed++;
  console.log('OK import');
}

// 2.b) جایگزینی select قدیمی با AccountSelect
// الگوی select: <select {...register(`lines.${idx}.accountId`)} ...>
const selectRegex = /<select[\s\S]*?\{\.\.\.register\(`lines\.\$\{idx\}\.accountId`\)\}[\s\S]*?<\/select>/;

if (selectRegex.test(j)) {
  // پیدا کردن کل بلوک select با options
  const match = j.match(selectRegex);
  console.log('select قدیمی پیدا شد، طول: ' + match[0].length);
  
  // جایگزین با Controller + AccountSelect
  // روش: استفاده از Controller از react-hook-form
  const replacement = `<Controller
                        name={\`lines.\${idx}.accountId\`}
                        control={control}
                        render={({ field }) => (
                          <AccountSelect
                            accounts={accounts}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="حساب را جستجو کنید..."
                          />
                        )}
                      />`;
  
  j = j.replace(match[0], replacement);
  changed++;
  console.log('OK جایگزینی select با AccountSelect');
} else {
  console.log('!! select پیدا نشد — نمایش خطوط 270-295');
  const lines = j.split('\n');
  for (let i = 269; i < 295 && i < lines.length; i++) {
    console.log(String(i + 1).padStart(3) + '| ' + lines[i].substring(0, 100));
  }
}

if (changed > 0) {
  fs.writeFileSync(jPath, j, 'utf8');
  console.log('✅ JournalFormPage.tsx ذخیره شد (' + changed + ' تغییر)');
}

console.log('');
console.log('=== DONE ===');