import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function DateDisplay() {
  const { jalali, gregorian, hijri } = useMemo(() => {
    const now = new Date();

    // Shamsi (Jalali)
    let jalali = '';
    try {
      jalali = new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      jalali = '—';
    }

    // Miladi (Gregorian)
    let gregorian = '';
    try {
      gregorian = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      gregorian = '—';
    }

    // Qamari (Hijri — Umm al-Qura)
    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);
    } catch {
      hijri = '';
    }

    return { jalali, gregorian, hijri };
  }, []);

  return (
    <div
      className="hidden lg:flex items-center gap-2 text-[11px] px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 whitespace-nowrap shrink-0"
      title="تاریخ امروز"
    >
      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />

      <span className="font-bold text-slate-700">{jalali}</span>

      <span className="text-slate-300">|</span>

      <span className="num text-slate-600 font-medium" dir="ltr">
        {gregorian}
      </span>

      {hijri && (
        <>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{hijri}</span>
        </>
      )}
    </div>
  );
}
