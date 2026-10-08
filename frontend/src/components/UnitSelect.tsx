import { useUnits } from '@/hooks/useUnits';
import { Loader2 } from 'lucide-react';

interface UnitSelectProps {
  /** برای حالت useState */
  value?: string;
  onChange?: (v: string) => void;
  /** برای react-hook-form — register('field') */
  registerProps?: any;
  /** برای react-hook-form — register('field', { ... }) */
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function UnitSelect({
  value,
  onChange,
  registerProps,
  className,
  disabled,
  placeholder,
}: UnitSelectProps) {
  const { units, loading } = useUnits();

  if (loading && units.length === 0) {
    return (
      <div className={(className || 'input') + ' flex items-center gap-2 text-slate-400'}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">در حال بارگذاری...</span>
      </div>
    );
  }

  const isRHF = !!registerProps;

  if (isRHF) {
    return (
      <select {...registerProps} disabled={disabled} className={className || 'input'}>
        {placeholder && <option value="">{placeholder}</option>}
        {units.map((u) => (
          <option key={u.code} value={u.code}>{u.name}</option>
        ))}
      </select>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={className || 'input'}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {units.map((u) => (
        <option key={u.code} value={u.code}>{u.name}</option>
      ))}
    </select>
  );
}
