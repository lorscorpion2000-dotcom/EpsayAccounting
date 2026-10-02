import { useOutletContext } from 'react-router-dom';
import type { Project } from '@/types/project';
import { toPersianDigits, formatNumber } from '@/utils/format';

export default function ProjectInfoTab() {
  const { project } = useOutletContext<{ project: Project }>();

  const items = [
    { label: 'کد پروژه', value: project.code, ltr: true },
    { label: 'نام پروژه', value: project.name },
    { label: 'کاربری', value: project.usage || '—' },
    { label: 'متراژ کل', value: project.totalArea ? formatNumber(Number(project.totalArea)) + ' مترمربع' : '—' },
    { label: 'تعداد طبقات', value: project.floorsCount ? toPersianDigits(project.floorsCount) : '—' },
    { label: 'کارفرما', value: project.client?.name || '—' },
    { label: 'مشاور/ناظر', value: project.consultant?.name || '—' },
    { label: 'استان', value: project.addressProvince || '—' },
    { label: 'شهر', value: project.addressCity || '—' },
    { label: 'آدرس کامل', value: project.addressFull || '—' },
    { label: 'تاریخ شروع', value: project.startDate ? toPersianDigits(new Date(project.startDate).toLocaleDateString('fa-IR')) : '—' },
    { label: 'پایان پیش‌بینی‌شده', value: project.plannedEndDate ? toPersianDigits(new Date(project.plannedEndDate).toLocaleDateString('fa-IR')) : '—' },
  ];

  return (
    <div className="card p-6">
      <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-brand-500 rounded"></span>
        اطلاعات پروژه
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {items.map((it, i) => (
          <div key={i} className="border-b border-slate-100 pb-3">
            <div className="text-xs text-slate-500 mb-1">{it.label}</div>
            <div className={`text-sm font-medium text-slate-800 ${it.ltr ? 'num' : ''}`} dir={it.ltr ? 'ltr' : 'rtl'}>
              {it.value}
            </div>
          </div>
        ))}
      </div>

      {project.description && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">توضیحات</div>
          <p className="text-sm text-slate-700 leading-relaxed">{project.description}</p>
        </div>
      )}
    </div>
  );
}
