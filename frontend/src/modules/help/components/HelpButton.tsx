import { HelpCircle } from 'lucide-react';
import { useHelp } from './HelpProvider';
import clsx from 'clsx';

interface Props {
  className?: string;
  variant?: 'header' | 'floating' | 'inline';
  label?: string;
}

export default function HelpButton({ className, variant = 'header', label }: Props) {
  const { open, currentHelp } = useHelp();

  if (!currentHelp) return null;

  if (variant === 'floating') {
    return (
      <button
        onClick={open}
        className={clsx(
          'fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full',
          'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl',
          'hover:scale-110 transition-transform flex items-center justify-center',
          'no-print',
          className,
        )}
        title="راهنمای این صفحه"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={open}
        className={clsx('btn-ghost text-brand-600 hover:bg-brand-50', className)}
      >
        <HelpCircle className="w-4 h-4" />
        {label || 'راهنما'}
      </button>
    );
  }

  // header variant
  return (
    <button
      onClick={open}
      className={clsx(
        'p-2 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors relative',
        'no-print',
        className,
      )}
      title="راهنمای این صفحه"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
