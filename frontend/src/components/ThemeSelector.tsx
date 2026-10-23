import { useState, useRef, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { THEMES } from '@/themes/themes';
import { useThemeStore } from '@/store/theme.store';

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeKey, setTheme } = useThemeStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={clsx(
          'p-2 rounded-lg transition-colors no-print',
          isOpen ? 'bg-brand-50 text-brand-600' : 'hover:bg-slate-100 text-slate-600',
        )}
        title="انتخاب پوسته رنگی"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[150] animate-fade-in overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-l from-brand-50 to-white">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-800 text-sm">پوسته رنگی</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3 max-h-[500px] overflow-y-auto">
            <p className="text-xs text-slate-500 mb-3">
              رنگ دلخواه خود را انتخاب کنید. تغییرات بلافاصله اعمال می‌شود و در پروفایل شما ذخیره می‌گردد.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((theme) => {
                const isActive = theme.key === themeKey;
                return (
                  <button
                    key={theme.key}
                    onClick={() => {
                      setTheme(theme.key);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      'relative p-3 rounded-xl border-2 transition-all text-right group',
                      isActive
                        ? 'border-brand-500 shadow-md shadow-brand-500/20'
                        : 'border-slate-200 hover:border-brand-300 hover:shadow-sm',
                    )}
                  >
                    {/* Active check */}
                    {isActive && (
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* Preview colors */}
                    <div className="flex gap-1.5 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg shadow-sm"
                        style={{ backgroundColor: theme.preview.primary }}
                        title="رنگ اصلی"
                      ></div>
                      <div
                        className="w-7 h-7 rounded-lg shadow-sm"
                        style={{ backgroundColor: theme.preview.accent }}
                        title="رنگ مکمل"
                      ></div>
                      <div
                        className="w-7 h-7 rounded-lg shadow-sm border border-slate-200"
                        style={{ backgroundColor: theme.preview.sidebar }}
                        title="سایدبار"
                      ></div>
                      <div
                        className="w-7 h-7 rounded-lg shadow-sm border border-slate-200"
                        style={{ backgroundColor: theme.preview.bg }}
                        title="پس‌زمینه"
                      ></div>
                    </div>

                    {/* Name */}
                    <div className="font-bold text-slate-800 text-xs mb-0.5">
                      {theme.name}
                    </div>
                    <div className="text-[10px] text-slate-400" dir="ltr">
                      {theme.nameEn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center">
            تغییرات به‌طور خودکار ذخیره می‌شوند
          </div>
        </div>
      )}
    </div>
  );
}
