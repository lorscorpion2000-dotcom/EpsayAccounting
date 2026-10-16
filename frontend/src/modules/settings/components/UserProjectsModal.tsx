import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Plus, Trash2, Star, FolderOpen } from 'lucide-react';
import { usersApi, SystemUser, AssignedProject } from '../services/users.api';
import { projectsApi } from '@/modules/projects/services/projects.api';

interface Props {
  isOpen: boolean;
  user: SystemUser | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export default function UserProjectsModal({ isOpen, user, onClose, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [assigned, setAssigned] = useState<AssignedProject[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([
        usersApi.listProjects(user.id),
        projectsApi.list() as unknown as Promise<ProjectOption[]>,
      ]);
      setAssigned(Array.isArray(mine) ? mine : []);
      setAllProjects(Array.isArray(all) ? all.map((p: any) => ({ id: p.id, code: p.code, name: p.name })) : []);
    } catch {
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      setSelectedToAdd('');
      load();
    } else {
      setAssigned([]);
      setAllProjects([]);
    }
  }, [isOpen, user?.id]);

  const assignedIds = new Set(assigned.map((a) => a.projectId));
  const availableProjects = allProjects.filter((p) => !assignedIds.has(p.id));

  const handleAdd = async () => {
    if (!user || !selectedToAdd) return;
    setSaving(true);
    try {
      await usersApi.assignProject(user.id, selectedToAdd);
      toast.success('پروژه تخصیص یافت');
      setSelectedToAdd('');
      await load();
      onChanged?.();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  const handleRemove = async (projectId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await usersApi.unassignProject(user.id, projectId);
      toast.success('تخصیص پروژه برداشته شد');
      await load();
      onChanged?.();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  const handleSetDefault = async (projectId: string | null) => {
    if (!user) return;
    setSaving(true);
    try {
      await usersApi.setDefaultProject(user.id, projectId);
      toast.success(projectId ? 'پروژه پیش‌فرض تعیین شد' : 'پروژه پیش‌فرض برداشته شد');
      await load();
      onChanged?.();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-slate-800">تخصیص پروژه</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              کاربر: {user.fullName} — <span dir="ltr" className="num">@{user.username}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {user.isStaff ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              این کاربر «ستادی» است و به همه‌ی پروژه‌ها دسترسی دارد. تخصیص‌های زیر تأثیری روی دسترسی ندارند و فقط برای نمایش «پروژه پیش‌فرض» استفاده می‌شوند.
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              افزودن پروژه جدید
            </label>
            <div className="flex gap-2">
              <select
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
                className="input flex-1"
                disabled={saving || availableProjects.length === 0}
              >
                <option value="">
                  {availableProjects.length === 0 ? 'همه‌ی پروژه‌ها تخصیص یافته‌اند' : 'یک پروژه انتخاب کنید...'}
                </option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                disabled={!selectedToAdd || saving}
                onClick={handleAdd}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                افزودن
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                پروژه‌های تخصیص‌یافته ({assigned.length})
              </label>
              {user.defaultProjectId ? (
                <button
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => handleSetDefault(null)}
                  disabled={saving}
                >
                  برداشتن پروژه پیش‌فرض
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="p-8 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : assigned.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">هنوز به هیچ پروژه‌ای تخصیص نیافته است</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {assigned.map((a) => {
                  const isDefault = user.defaultProjectId === a.projectId;
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                          {a.project.code.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{a.project.name}</div>
                          <div className="text-xs text-slate-500 num" dir="ltr">{a.project.code}</div>
                        </div>
                        {isDefault ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            پیش‌فرض
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isDefault ? (
                          <button
                            onClick={() => handleSetDefault(a.projectId)}
                            disabled={saving}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                            title="تعیین به عنوان پروژه پیش‌فرض"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleRemove(a.projectId)}
                          disabled={saving}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                          title="برداشتن تخصیص"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn-secondary" onClick={onClose}>بستن</button>
        </div>
      </div>
    </div>
  );
}
