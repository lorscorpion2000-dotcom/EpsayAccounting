import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Target, ChevronDown, ChevronLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  costCentersApi,
  type CostCenter,
  type CostCenterInput,
  type ProjectRef,
} from '../services/cost-centers.api';

export default function CostCentersPage() {
  const [items, setItems] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [list, prjs] = await Promise.all([
        costCentersApi.list(),
        costCentersApi.projects().catch(() => [] as ProjectRef[]),
      ]);
      setItems(list);
      setProjects(prjs);
      const roots = list.filter((x) => !x.parentId).map((x) => x.id);
      setExpanded(new Set(roots));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const childrenMap = useMemo(() => {
    const m = new Map<string | null, CostCenter[]>();
    for (const x of items) {
      const key = x.parentId ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(x);
    }
    return m;
  }, [items]);

  const matchesFilters = (cc: CostCenter) => {
    if (filterProject && cc.projectId !== filterProject) return false;
    if (filterActive === 'active' && !cc.isActive) return false;
    if (filterActive === 'inactive' && cc.isActive) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      const match =
        cc.code.toLowerCase().includes(s) ||
        cc.name.toLowerCase().includes(s) ||
        (cc.project?.name ?? '').toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  };

  const isVisible = (cc: CostCenter): boolean => {
    if (matchesFilters(cc)) return true;
    const kids = childrenMap.get(cc.id) ?? [];
    return kids.some((k) => isVisible(k));
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (cc: CostCenter) => { setEditing(cc); setShowForm(true); };

  const handleSubmit = async (payload: CostCenterInput) => {
    setBusy(true);
    try {
      if (editing) {
        await costCentersApi.update(editing.id, payload);
        toast.success('مرکز هزینه به‌روزرسانی شد');
      } else {
        await costCentersApi.create(payload);
        toast.success('مرکز هزینه ایجاد شد');
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در ذخیره');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await costCentersApi.remove(deleteTarget.id);
      toast.success('حذف شد');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'خطا در حذف');
    } finally {
      setBusy(false);
    }
  };

  const roots = childrenMap.get(null) ?? [];
  const visibleRoots = roots.filter(isVisible);

  const renderRow = (cc: CostCenter, depth: number): ReactNode => {
    const kids = (childrenMap.get(cc.id) ?? []).filter(isVisible);
    const hasKids = kids.length > 0;
    const isOpen = expanded.has(cc.id);
    return (
      <>
        <tr key={cc.id} className="border-t border-slate-100 hover:bg-slate-50/60">
          <td className="px-4 py-2">
            <div className="flex items-center" style={{ paddingRight: depth * 20 }}>
              {hasKids ? (
                <button onClick={() => toggle(cc.id)} className="p-0.5 rounded hover:bg-slate-100 text-slate-500 mr-1">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                </button>
              ) : (
                <span className="inline-block w-5 mr-1" />
              )}
              <span className="font-mono text-xs text-slate-600">{cc.code}</span>
            </div>
          </td>
          <td className="px-4 py-2 text-slate-800">{cc.name}</td>
          <td className="px-4 py-2 text-slate-600 text-xs">
            {cc.project ? (
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} /> {cc.project.code} — {cc.project.name}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </td>
          <td className="px-4 py-2 text-center text-xs text-slate-500">
            {cc._count?.journalLines ?? 0}
          </td>
          <td className="px-4 py-2 text-center">
            {cc.isActive ? (
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">فعال</span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">غیرفعال</span>
            )}
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => openEdit(cc)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="ویرایش">
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeleteTarget(cc)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="حذف">
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
        {hasKids && isOpen && kids.map((k) => renderRow(k, depth + 1))}
      </>
    );
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">مراکز هزینه</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              دسته‌بندی هزینه‌ها بر اساس واحد، کارگاه یا مرکز مسئولیت
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
            title="بارگذاری مجدد"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            <Plus size={16} />
            مرکز هزینه جدید
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در کد یا نام..."
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">همه‌ی پروژه‌ها</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">همه</option>
          <option value="active">فقط فعال</option>
          <option value="inactive">فقط غیرفعال</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3 font-medium w-48">کد / ساختار</th>
              <th className="text-right px-4 py-3 font-medium">نام</th>
              <th className="text-right px-4 py-3 font-medium w-56">پروژه</th>
              <th className="text-center px-4 py-3 font-medium w-24">اسناد</th>
              <th className="text-center px-4 py-3 font-medium w-24">وضعیت</th>
              <th className="text-center px-4 py-3 font-medium w-24">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">در حال بارگذاری...</td></tr>
            )}
            {!loading && visibleRoots.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">موردی یافت نشد</td></tr>
            )}
            {!loading && visibleRoots.map((cc) => renderRow(cc, 0))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CCFormModal
          editing={editing}
          items={items}
          projects={projects}
          busy={busy}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">حذف مرکز هزینه</h3>
            <p className="text-sm text-slate-600 mb-4">
              آیا از حذف <span className="font-mono">{deleteTarget.code}</span> «{deleteTarget.name}» مطمئن هستید؟
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >{busy ? '...' : 'حذف'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CCFormModal({
  editing, items, projects, busy, onCancel, onSubmit,
}: {
  editing: CostCenter | null;
  items: CostCenter[];
  projects: ProjectRef[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: CostCenterInput) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [parentId, setParentId] = useState(editing?.parentId ?? '');
  const [projectId, setProjectId] = useState(editing?.projectId ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const descendentIds = useMemo(() => {
    if (!editing) return new Set<string>();
    const out = new Set<string>();
    const stack = [editing.id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (out.has(cur)) continue;
      out.add(cur);
      for (const x of items) if (x.parentId === cur) stack.push(x.id);
    }
    return out;
  }, [editing, items]);

  const parentOptions = items.filter((x) => !descendentIds.has(x.id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('نام الزامی است'); return; }
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      parentId: parentId || null,
      projectId: projectId || null,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            {editing ? 'ویرایش مرکز هزینه' : 'مرکز هزینه جدید'}
          </h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نام *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: کارگاه شماره ۱"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">والد (اختیاری)</label>
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— بدون والد —</option>
              {parentOptions.map((x) => (
                <option key={x.id} value={x.id}>{x.code} — {x.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">پروژه (اختیاری)</label>
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— عمومی (بدون پروژه) —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">فعال</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">انصراف</button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >{busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ایجاد')}</button>
        </div>
      </form>
    </div>
  );
}