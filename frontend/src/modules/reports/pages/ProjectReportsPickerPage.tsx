import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Building2, Search, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';

export default function ProjectReportsPickerPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/projects')
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('خطا در بارگذاری پروژه‌ها'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? items.filter((p) => p.name.includes(search) || p.code.includes(search))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-600" />
            گزارشات پروژه
          </h1>
          <p className="text-sm text-slate-500 mt-1">یک پروژه را انتخاب کنید تا همه‌ی گزارشات مرتبط را ببینید</p>
        </div>
        <button onClick={() => nav('/reports')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> بازگشت
        </button>
      </div>

      <div className="card p-4">
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
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">هیچ پروژه‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => nav('/reports/project/' + p.id)}
              className="card p-5 text-right hover:shadow-card-hover hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500 num mt-1" dir="ltr">{p.code}</div>
                  {p.client?.name && (
                    <div className="text-xs text-slate-400 mt-1">کارفرما: {p.client.name}</div>
                  )}
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
