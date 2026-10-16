import { useEffect, useState } from 'react';
import { ChevronDown, FolderOpen, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore } from '@/store/project.store';
import { projectsApi } from '@/modules/projects/services/projects.api';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export default function ProjectSwitcher() {
  const user = useAuthStore((s) => s.user);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const isStaff = !!user?.isStaff;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = (await projectsApi.list()) as any[];
        if (!mounted) return;
        setProjects(
          Array.isArray(list)
            ? list.map((p) => ({ id: p.id, code: p.code, name: p.name }))
            : [],
        );
      } catch {
        if (mounted) toast.error('خطا در بارگذاری پروژه‌ها');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // اگر کاربر عادی است و هنوز پروژه فعالی انتخاب نکرده، از defaultProjectId یا اولین پروژه استفاده کن
  useEffect(() => {
    if (isStaff) return;
    if (activeProjectId) {
      if (!projects.find((p) => p.id === activeProjectId)) {
        setActiveProject(null);
      }
      return;
    }
    if (!projects.length) return;
    const fallback =
      user?.defaultProjectId && projects.find((p) => p.id === user.defaultProjectId)
        ? user.defaultProjectId
        : projects[0].id;
    setActiveProject(fallback);
  }, [projects, isStaff, activeProjectId, user?.defaultProjectId]);

  const current = projects.find((p) => p.id === activeProjectId) || null;

  // اگر کاربر هیچ پروژه‌ای ندارد، سوییچر را نشان نده
  if (!loading && projects.length === 0 && !isStaff) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <FolderOpen className="w-3.5 h-3.5" />
        بدون پروژه
      </div>
    );
  }

  return (
    <div className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors min-w-[180px] max-w-[260px]"
        title="انتخاب پروژه‌ی فعال"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : isStaff && !current ? (
          <Layers className="w-4 h-4 text-brand-600 shrink-0" />
        ) : (
          <FolderOpen className="w-4 h-4 text-brand-600 shrink-0" />
        )}
        <span className="truncate flex-1 text-right">
          {isStaff && !current
            ? 'همه پروژه‌ها'
            : current
              ? current.name
              : 'انتخاب پروژه'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 start-0 z-50 w-72 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden max-h-80 overflow-y-auto">
            {isStaff ? (
              <button
                onClick={() => {
                  setActiveProject(null);
                  setOpen(false);
                  toast.success('نمای «همه پروژه‌ها»');
                }}
                className={
                  'w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 ' +
                  (!current ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700')
                }
              >
                <Layers className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>همه پروژه‌ها</div>
                  <div className="text-xs text-slate-400">نمای کامل (کاربر ستادی)</div>
                </div>
              </button>
            ) : null}

            {projects.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                پروژه‌ای یافت نشد
              </div>
            ) : (
              projects.map((p) => {
                const selected = activeProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p.id);
                      setOpen(false);
                      toast.success('پروژه‌ی فعال: ' + p.name);
                    }}
                    className={
                      'w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 ' +
                      (selected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700')
                    }
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 num" dir="ltr">{p.code}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
