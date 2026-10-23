import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import DateObject from 'react-date-object';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { forwardRef } from 'react';

interface Props {
  value?: string | null;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PersianDatePicker = forwardRef<HTMLDivElement, Props>(
  ({ value, onChange, placeholder = 'انتخاب تاریخ', disabled, hasError, size = 'md' }, ref) => {
    const dateValue = value
      ? new DateObject({ date: new Date(value), calendar: persian, locale: persian_fa })
      : undefined;

    // اندازه‌های مختلف
    const sizeClasses = {
      sm: 'px-3 py-2 text-xs ps-9',
      md: 'px-3.5 py-2.5 text-sm ps-10',
      lg: 'px-4 py-3 text-base ps-11',
    };
    const iconSize = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
    const iconPos = { sm: 'start-2.5', md: 'start-3', lg: 'start-3.5' };

    return (
      <div className="relative w-full" ref={ref}>
        <DatePicker
          value={dateValue}
          onChange={(date: DateObject | DateObject[] | null) => {
            if (!date || Array.isArray(date)) {
              onChange(null);
              return;
            }
            const g = date.convert(undefined, undefined).toDate();
            const yyyy = g.getFullYear();
            const mm = String(g.getMonth() + 1).padStart(2, '0');
            const dd = String(g.getDate()).padStart(2, '0');
            onChange(`${yyyy}-${mm}-${dd}`);
          }}
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-right"
          disabled={disabled}
          inputClass="hidden"
          placeholder={placeholder}
          containerClassName="w-full"
          editable={false}
          /* 🔑 حل مشکل قطع شدن در modal */
          portal
          zIndex={100}
          /* 🎨 بزرگ‌تر کردن تقویم */
          style={{ fontSize: size === 'lg' ? '15px' : size === 'sm' ? '12px' : '13px' }}
          className="rmdp-custom"
          render={(val, openCalendar) => (
            <>
              <input
                type="text"
                readOnly
                value={val || ''}
                placeholder={placeholder}
                onClick={openCalendar}
                className={`w-full ${sizeClasses[size]} rounded-lg border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all cursor-pointer ${
                  hasError ? 'border-red-400' : 'border-slate-200'
                }`}
                disabled={disabled}
              />
              <CalendarIcon
                className={`${iconSize[size]} absolute ${iconPos[size]} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`}
              />
              {val && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        />
      </div>
    );
  },
);

PersianDatePicker.displayName = 'PersianDatePicker';