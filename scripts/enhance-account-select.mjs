import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

const comp = `import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X, Loader2, AlertCircle, Star, Clock } from 'lucide-react';
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

const RECENT_KEY = 'epsay-recent-accounts';
const FAV_KEY = 'epsay-fav-accounts';

function loadList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveList(key: string, list: string[]) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, 20))); } catch {}
}

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
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentIds(loadList(RECENT_KEY));
    setFavIds(loadList(FAV_KEY));
  }, []);

  const selected = useMemo(() => accounts.find((a) => a.id === value), [accounts, value]);

  const isFavorite = (id: string) => favIds.includes(id);
  const toggleFavorite = (id: string) => {
    const next = isFavorite(id) ? favIds.filter((x) => x !== id) : [id, ...favIds];
    setFavIds(next);
    saveList(FAV_KEY, next);
  };

  const recordRecent = (id: string) => {
    const next = [id, ...recentIds.filter((x) => x !== id)].slice(0, 10);
    setRecentIds(next);
    saveList(RECENT_KEY, next);
  };

  // حساب\u200Cهای مورد علاقه
  const favAccounts = useMemo(
    () => favIds.map((id) => accounts.find((a) => a.id === id)).filter(Boolean) as Account[],
    [favIds, accounts],
  );

  // حساب\u200Cهای اخیر (بدون تکرار با مورد علاقه)
  const recentAccounts = useMemo(
    () => recentIds.map((id) => accounts.find((a) => a.id === id))
      .filter(Boolean)
      .filter((a: any) => !favIds.includes(a.id)) as Account[],
    [recentIds, accounts, favIds],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts.slice(0, 100);
    return accounts.filter((a) => {
      const code = (a.code || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return code.includes(term) || name.includes(term);
    }).slice(0, 100);
  }, [accounts, search]);

  const isSearching = search.trim().length > 0;

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-idx="' + highlightIdx + '"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
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
        recordRecent(filtered[highlightIdx].id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const pickAccount = (a: Account) => {
    onChange(a.id);
    recordRecent(a.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
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
            <span className="num font-mono text-xs text-slate-500 shrink-0" dir="ltr">{selected.code}</span>
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

      {open && (
        <div className="absolute top-full mt-1 start-0 end-0 z-50 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
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

          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : isSearching ? (
              // حالت جستجو
              filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  حسابی پیدا نشد
                </div>
              ) : (
                filtered.map((a, idx) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    isSelected={a.id === value}
                    isHighlighted={idx === highlightIdx}
                    isFav={isFavorite(a.id)}
                    onToggleFav={() => toggleFavorite(a.id)}
                    onPick={() => pickAccount(a)}
                    idx={idx}
                  />
                ))
              )
            ) : (
              // حالت نمایش گروه‌بندی
              <>
                {favAccounts.length > 0 && (
                  <>
                    <SectionHeader icon={<Star className="w-3 h-3 text-amber-500" />} label="مورد علاقه" count={favAccounts.length} />
                    {favAccounts.map((a, idx) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        isSelected={a.id === value}
                        isHighlighted={false}
                        isFav
                        onToggleFav={() => toggleFavorite(a.id)}
                        onPick={() => pickAccount(a)}
                        idx={-1}
                      />
                    ))}
                  </>
                )}
                {recentAccounts.length > 0 && (
                  <>
                    <SectionHeader icon={<Clock className="w-3 h-3 text-slate-400" />} label="اخیر" count={recentAccounts.length} />
                    {recentAccounts.map((a, idx) => (
                      <AccountRow
                        key={a.id}
                        account={a}
                        isSelected={a.id === value}
                        isHighlighted={false}
                        isFav={false}
                        onToggleFav={() => toggleFavorite(a.id)}
                        onPick={() => pickAccount(a)}
                        idx={-1}
                      />
                    ))}
                  </>
                )}
                <SectionHeader icon={null} label="همه حساب‌ها" count={filtered.length} />
                {filtered.map((a, idx) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    isSelected={a.id === value}
                    isHighlighted={idx === highlightIdx}
                    isFav={isFavorite(a.id)}
                    onToggleFav={() => toggleFavorite(a.id)}
                    onPick={() => pickAccount(a)}
                    idx={idx}
                  />
                ))}
                {filtered.length === 100 && (
                  <div className="px-3 py-2 text-xs text-slate-400 text-center border-t bg-slate-50">
                    نمایش ۱۰۰ مورد اول — برای نتیجه دقیق‌تر جستجو کنید
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count }: any) {
  return (
    <div className="px-3 py-1.5 bg-slate-50 border-y text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 sticky top-0">
      {icon}
      <span>{label}</span>
      <span className="text-slate-400">({count})</span>
    </div>
  );
}

function AccountRow({ account, isSelected, isHighlighted, isFav, onToggleFav, onPick, idx }: any) {
  return (
    <div
      data-idx={idx}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors group',
        isHighlighted ? 'bg-brand-50' : 'hover:bg-slate-50',
        isSelected && 'font-bold',
      )}
      onMouseEnter={() => {}}
      onClick={onPick}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className="p-0.5 rounded hover:bg-amber-100 shrink-0"
        title={isFav ? 'حذف از مورد علاقه' : 'افزودن به مورد علاقه'}
      >
        <Star className={clsx('w-3.5 h-3.5', isFav ? 'fill-amber-500 text-amber-500' : 'text-slate-300 group-hover:text-amber-300')} />
      </button>
      <span className="num font-mono text-xs text-slate-500 w-24 shrink-0 text-left" dir="ltr">{account.code}</span>
      <span className="flex-1 truncate">{account.name}</span>
      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded shrink-0', LEVEL_COLORS[account.level] || 'bg-slate-100')}>
        {LEVEL_LABELS[account.level] || account.level}
      </span>
    </div>
  );
}
`;

fs.writeFileSync(ROOT + '/frontend/src/modules/accounting/components/AccountSelect.tsx', comp, 'utf8');
console.log('✅ AccountSelect.tsx ارتقا یافت');