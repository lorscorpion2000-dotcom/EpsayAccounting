import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Building2, MapPin, Calendar, FileText, Layers, Printer, FileSpreadsheet, Edit, Eye, Archive } from 'lucide-react';
import { projectsApi } from '../services/projects.api';
import type { Project, ProjectStatus } from '@/types/project';
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_TYPE_LABELS,
} from '@/types/project';
import { formatNumber, toPersianDigits } from '@/utils/format';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
import PagePrintButton from '@/components/PagePrintButton'; // PHASE2_PRINT_PATCHED
export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setProjects(data);
    } catch {
      toast.error('خطا در بارگذاری پروژه‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDelete = async (force = false) => {
    if (!deletingProject) return;
    setDeleting(true);
    setForceError(null);
    try {
      const res = await projectsApi.remove(deletingProject.id, force);
      if (res?.hardDeleted) {
        toast.success('پروه بهطور کامل حذف شد');
      } else {
        toast.success('پروه غیرفعال شد');
      }
      setDeletingProject(null);
      setForceConfirm(false);
      loadData();
    } catch (e: any) {
      const err = e?.response?.data;
      if (err?.code === 'PROJECT_HAS_REFS') {
        setForceError(err.message);
      } else {
      const msg = err?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در حذف');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">پروژه‌ها</h1>
          <p className="text-sm text-slate-500 mt-1">
            مدیریت پروژه‌ها، قراردادها و ساختار شکست کار
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          پروژه جدید
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو بر اساس نام یا کد پروژه..."
                className="input ps-10 pe-4 w-full"
              />
            </div>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">همه وضعیت‌ها</option>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((k) => (
              <option key={k} value={k}>{PROJECT_STATUS_LABELS[k]}</option>
            ))}
          </select>

          <PagePrintButton documentTitle="پروژه‌ها" />
          <button className="btn-secondary" onClick={loadData}>
            <FileSpreadsheet className="w-4 h-4" />
            به‌روزرسانی
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">هیچ پروژه‌ای یافت نشد</p>
          <button
            onClick={() => navigate('/projects/new')}
            className="btn-primary mt-4"
          >
            <Plus className="w-4 h-4" />
            ساخت اولین پروژه
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="card p-5 hover:shadow-card-hover transition-all group relative"
            >
              {/* Action buttons - shown on hover */}
              <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/projects/' + p.id); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-brand-50 hover:text-brand-600 text-slate-600 transition-colors"
                  title="مشاهده"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/projects/' + p.id + '/edit'); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-600 transition-colors"
                  title="ویرایش"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingProject(p); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors"
                  title="حذف"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                        <AdminDeleteButton
                          endpoint="/projects"
                          id={p.id}
                          itemLabel={(p as any).code || (p as any).name || (p as any).title || ''}
                          onSuccess={loadData}
                        />
              </div>

              {/* Clickable area */}
              <div
                onClick={() => navigate('/projects/' + p.id)}
                className="cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 num" dir="ltr">{p.code}</div>
                    </div>
                  </div>
                </div>

                {/* Status & Type */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${PROJECT_STATUS_COLORS[p.status]}`}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {PROJECT_TYPE_LABELS[p.type]}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-600">
                  {p.client && (
                    <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{p.client.name}</span>
                    </div>
                  )}
                  {(p.addressProvince || p.addressCity) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{[p.addressProvince, p.addressCity].filter(Boolean).join(' - ')}</span>
                    </div>
                  )}
                  {p.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="num">
                        {toPersianDigits(new Date(p.startDate).toLocaleDateString('fa-IR'))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="num">{formatNumber(p._count?.contracts ?? 0)}</span> قرارداد
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="num">{formatNumber(p._count?.wbsItems ?? 0)}</span> WBS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingProject && !forceConfirm}
        title="غیرفعالسازی پروه"
        message={`پروه «${deletingProject?.name}» غیرفعال شود این عمل قابل بازگشت است.`}
        confirmLabel="بله غیرفعال شود"
        variant="danger"
        loading={deleting}
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeletingProject(null); setForceError(null); }}
      />

      {/* Force delete modal */}
      {forceError && deletingProject && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">حذف کامل پروه (مدیر سیستم)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {forceError}
              </p>
              <p className="text-xs text-slate-500">
                با کلیک روی «حذف کامل» تمام ارجاعهای این پروه پاک میشود. اطمینان دارید
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setDeletingProject(null); }} className="btn-secondary">
                  انصراف
                </button>
                <button onClick={() => handleDelete(true)} disabled={deleting} className="btn-danger">
                  {deleting ? 'در حال حذف...' : 'حذف کامل (خطرناک)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
