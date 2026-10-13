import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, ArrowRight, Trash2, Edit, FolderTree } from 'lucide-react';
import { expenseCategoriesApi } from '../services/expenses.api';
import type { ExpenseCategory } from '@/types/expense';

export default function ExpenseCategoriesPage() {
  const nav = useNavigate();
  const [tree, setTree] = useState<ExpenseCategory[]>([]);
  const [flat, setFlat] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ExpenseCategory> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([expenseCategoriesApi.tree(), expenseCategoriesApi.list()]);
      setTree(t); setFlat(f);
    } catch { toast.error('خطا در بارگذاری'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) { toast.error('نام لازم است'); return; }
    try {
      if (editing.id) {
        await expenseCategoriesApi.update(editing.id, editing);
        toast.success('ویرایش شد');
      } else {
        await expenseCategoriesApi.create(editing);
        toast.success('ثبت شد');
      }
      setEditing(null);
      await load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'خطا'); }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف شود؟')) return;
    try { await expenseCategoriesApi.remove(id); toast.success('حذف شد'); await load(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'خطا'); }
  };

  const renderNode = (n: ExpenseCategory, depth = 0) => (
    <div key={n.id}>
      <div className="flex items-center justify-between py-2 border-b border-slate-100 group" style={{ paddingRight: depth * 24 + 8 }}>
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{n.name}</span>
          <span className="text-xs num font-mono text-slate-400" dir="ltr">{n.code}</span>
          {!n.isActive && <span className="text-xs text-slate-400">(غیرفعال)</span>}
          {n._count && <span className="text-xs text-slate-400">— {n._count.expenses} هزینه</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <button className="p-1 text-slate-500 hover:text-brand-600" onClick={() => setEditing(n)}>
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-1 text-slate-500 hover:text-red-600" onClick={() => remove(n.id)}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {n.children?.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-brand-600" />
            دسته‌بندی هزینه‌ها
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => nav('/expenses')}>
            <ArrowRight className="w-4 h-4" /> بازگشت
          </button>
          <button className="btn-primary" onClick={() => setEditing({ isActive: true, sortOrder: 0 })}>
            <Plus className="w-4 h-4" /> دسته جدید
          </button>
        </div>
      </div>

      {editing && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">نام *</label>
              <input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">والد (اختیاری)</label>
              <select className="input" value={editing.parentId || ''} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}>
                <option value="">— بدون والد —</option>
                {flat.filter((f) => f.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ترتیب</label>
              <input type="number" className="input num" dir="ltr" value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                فعال
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditing(null)}>انصراف</button>
            <button className="btn-primary" onClick={save}>ذخیره</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-slate-400">در حال بارگذاری...</div>
      ) : (
        <div className="card px-2">
          {tree.length === 0 ? (
            <div className="p-12 text-center text-slate-500">دسته‌ای ثبت نشده</div>
          ) : (
            tree.map((n) => renderNode(n))
          )}
        </div>
      )}
    </div>
  );
}
