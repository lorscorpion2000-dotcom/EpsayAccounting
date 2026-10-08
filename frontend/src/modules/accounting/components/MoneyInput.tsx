import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface Props {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
}

function fmt(n: number): string {
  if (!n) return '';
  return n.toLocaleString('en-US');
}

function parseNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function MoneyInput({
  value, onChange, disabled, placeholder = '0',
  className, autoFocus, onKeyDown, onFocus,
}: Props) {
  const [display, setDisplay] = useState(fmt(value));

  useEffect(() => {
    const current = parseNum(display);
    if (current !== value) setDisplay(fmt(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      dir="ltr"
      value={display}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onChange={(e) => {
        setDisplay(e.target.value);
        onChange(parseNum(e.target.value));
      }}
      onBlur={() => setDisplay(fmt(value))}
      className={clsx('input w-full text-sm num text-left', className)}
    />
  );
}
