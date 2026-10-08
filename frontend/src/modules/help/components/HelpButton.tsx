import { HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { useHelp } from './HelpProvider';

interface HelpButtonProps {
  variant?: 'inline' | 'floating';
}

export default function HelpButton({ variant = 'inline' }: HelpButtonProps) {
  const { open, currentHelp } = useHelp();
  const hasPageHelp = !!currentHelp;

  if (variant === 'floating') {
    return (
      <button
        onClick={open}
        title={hasPageHelp ? 'راهنمای این صفحه' : 'راهنمای جامع'}
        aria-label="راهنما"
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group print:hidden"
      >
        <HelpCircle className="w-6 h-6" />
        {hasPageHelp && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        )}
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {hasPageHelp ? 'راهنمای این صفحه' : 'راهنمای جامع'}
        </span>
      </button>
    );
  }

  // inline — برای header
  return (
    <button
      onClick={open}
      title={hasPageHelp ? 'راهنمای این صفحه' : 'راهنمای جامع'}
      aria-label="راهنما"
      className={clsx(
        'relative p-2 rounded-lg transition-colors',
        hasPageHelp
          ? 'text-brand-600 hover:bg-brand-50'
          : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      <HelpCircle className="w-5 h-5" />
      {hasPageHelp && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}
