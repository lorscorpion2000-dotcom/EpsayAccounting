import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/utils/format';

interface Props {
  icon: LucideIcon;
  label: string;
  value: number | string;
  unit?: string;
  color: 'brand' | 'emerald' | 'amber' | 'blue' | 'rose' | 'violet';
  onClick?: () => void;
}

const COLOR_MAP = {
  brand: 'from-brand-500 to-brand-700 shadow-brand-500/20',
  emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/20',
  amber: 'from-amber-500 to-amber-700 shadow-amber-500/20',
  blue: 'from-blue-500 to-blue-700 shadow-blue-500/20',
  rose: 'from-rose-500 to-rose-700 shadow-rose-500/20',
  violet: 'from-violet-500 to-violet-700 shadow-violet-500/20',
};

export default function KpiCard({ icon: Icon, label, value, unit, color, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'card p-5 transition-all',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-800 num truncate" dir="ltr">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {unit && <p className="text-xs text-slate-500 mt-0.5">{unit}</p>}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0 me-1', COLOR_MAP[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
