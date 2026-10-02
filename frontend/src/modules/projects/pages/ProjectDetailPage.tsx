import { useEffect, useState } from 'react';
import { useNavigate, useParams, Outlet, NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Edit, Loader2, Building2, MapPin, Calendar,
  Layers, FileText, DollarSign, Package,
} from 'lucide-react';
import clsx from 'clsx';
import { projectsApi } from '../services/projects.api';
import type { Project } from '@/types/project';
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  PROJECT_TYPE_LABELS, PROJECT_USAGE_LABELS,
} from '@/types/project';
import { toPersianDigits } from '@/utils/format';

const TABS = [
  { to: '', label: 'شناسنامه', icon: Building2, end: true },
  { to: 'contracts', label: 'قراردادها', icon: FileText, end: false },
  { to: 'wbs', label: 'ساختار شکست کار', icon: Layers, end: false },
  { to: 'budgets', label: 'بودجه', icon: DollarSign, end: false },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    projectsApi.get(id)
      .then(setProject)
      .catch(() => toast.error('خطا در بارگذاری پروژه'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!project) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/projects')} className="hover:text-brand-600 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          پروژه‌ها
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium">{project.name}</span>
      </div>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-md border ${PROJECT_STATUS_COLORS[project.status]}`}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num" dir="ltr">{project.code}</span>
                <span className="text-slate-300">•</span>
                <span>{PROJECT_TYPE_LABELS[project.type]}</span>
                {project.usage && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{PROJECT_USAGE_LABELS[project.usage]}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/projects/' + project.id + '/edit')}
            className="btn-secondary"
          >
            <Edit className="w-4 h-4" />
            ویرایش
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <StatBox
            icon={MapPin}
            label="آدرس"
            value={[project.addressProvince, project.addressCity].filter(Boolean).join(' - ') || '—'}
          />
          <StatBox
            icon={Calendar}
            label="تاریخ شروع"
            value={project.startDate ? toPersianDigits(new Date(project.startDate).toLocaleDateString('fa-IR')) : '—'}
          />
          <StatBox
            icon={Layers}
            label="آیتم‌های WBS"
            value={toPersianDigits(project._count?.wbsItems ?? 0)}
          />
          <StatBox
            icon={FileText}
            label="قراردادها"
            value={toPersianDigits(project._count?.contracts ?? 0)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to === '' ? '/projects/' + project.id : '/projects/' + project.id + '/' + t.to}
                end={t.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    isActive
                      ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <Outlet context={{ project }} />
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-medium text-slate-800 num">{value}</div>
      </div>
    </div>
  );
}
