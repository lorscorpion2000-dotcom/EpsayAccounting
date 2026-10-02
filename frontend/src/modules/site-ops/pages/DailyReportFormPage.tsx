import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Plus, Trash2, ClipboardList,
  Users, Truck, Package, TrendingUp, Cloud, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { siteOpsApi } from '../services/site-ops.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project } from '@/types/project';
import {
  WEATHER_LABELS, ATTENDANCE_LABELS, EQUIPMENT_STATUS_LABELS,
  WeatherCondition, AttendanceStatus, EquipmentStatus,
} from '@/types/site-ops';

type Tab = 'general' | 'workers' | 'equipment' | 'materials' | 'progress';

interface FormData {
  projectId: string;
  reportDate?: string;
  weather?: WeatherCondition;
  tempMin?: number;
  tempMax?: number;
  operations?: string;
  issues?: string;
  incidents?: string;
  workers: any[];
  equipments: any[];
  materials: any[];
  progresses: any[];
}

export default function DailyReportFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [tab, setTab] = useState<Tab>('general');
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      reportDate: new Date().toISOString().slice(0, 10),
      workers: [],
      equipments: [],
      materials: [],
      progresses: [],
    },
  });

  const workersFA = useFieldArray({ control, name: 'workers' });
  const equipmentsFA = useFieldArray({ control, name: 'equipments' });
  const materialsFA = useFieldArray({ control, name: 'materials' });
  const progressesFA = useFieldArray({ control, name: 'progresses' });

  const projectId = watch('projectId');

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);

    if (isEdit && id) {
      siteOpsApi.reports.get(id).then((r) => {
        reset({
          projectId: r.projectId,
          reportDate: r.reportDate?.slice(0, 10),
          weather: r.weather || undefined,
          tempMin: r.tempMin || undefined,
          tempMax: r.tempMax || undefined,
          operations: r.operations || undefined,
          issues: r.issues || undefined,
          incidents: r.incidents || undefined,
          workers: (r.workers || []).map((w) => ({
            teamName: w.teamName,
            foreman: w.foreman,
            workerCount: w.workerCount,
            workHours: Number(w.workHours),
            overtime: Number(w.overtime),
            status: w.status,
            wbsItemId: w.wbsItemId,
            description: w.description,
          })),
          equipments: (r.equipments || []).map((e) => ({
            name: e.name,
            plateNumber: e.plateNumber,
            operator: e.operator,
            hoursWorked: Number(e.hoursWorked),
            status: e.status,
            description: e.description,
          })),
          materials: (r.materials || []).map((m) => ({
            itemName: m.itemName,
            unit: m.unit,
            quantity: Number(m.quantity),
            supplier: m.supplier,
            vehiclePlate: m.vehiclePlate,
            billNumber: m.billNumber,
            description: m.description,
          })),
          progresses: (r.progresses || []).map((p) => ({
            wbsItemId: p.wbsItemId,
            description: p.description,
            progressPct: Number(p.progressPct),
            notes: p.notes,
          })),
        });
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    } else {
      setLoadingData(false);
    }
  }, [id, isEdit, reset]);

  useEffect(() => {
    if (!projectId) { setWbsItems([]); return; }
    api.get('/wbs', { params: { projectId } }).then((r) => {
      const flat: any[] = [];
      const walk = (arr: any[], d = 0) => {
        arr.forEach((x) => {
          flat.push({ ...x, indent: '— '.repeat(d) });
          if (x.children?.length) walk(x.children, d + 1);
        });
      };
      walk(r.data || []);
      setWbsItems(flat);
    }).catch(() => setWbsItems([]));
  }, [projectId]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        weather: data.weather || undefined,
      };
      if (isEdit && id) {
        await siteOpsApi.reports.update(id, payload);
        toast.success('گزارش ویرایش شد');
      } else {
        await siteOpsApi.reports.create(payload);
        toast.success('گزارش ایجاد شد');
      }
      navigate('/site-ops/daily-reports');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const TABS = [
    { key: 'general', label: 'عمومی', icon: Cloud },
    { key: 'workers', label: 'نیروی انسانی', icon: Users, count: workersFA.fields.length },
    { key: 'equipment', label: 'ماشین‌آلات', icon: Truck, count: equipmentsFA.fields.length },
    { key: 'materials', label: 'مصالح وارده', icon: Package, count: materialsFA.fields.length },
    { key: 'progress', label: 'پیشرفت', icon: TrendingUp, count: progressesFA.fields.length },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش گزارش روزانه' : 'گزارش روزانه جدید'}
        </h1>
        <button onClick={() => navigate('/site-ops/daily-reports')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tabs */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key as Tab)}
                  className={clsx(
                    'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    tab === t.key
                      ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'general' && (
          <div className="card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">پروژه *</label>
                <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                  <option value="">— انتخاب کنید —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">تاریخ گزارش *</label>
                <Controller
                  name="reportDate"
                  control={control}
                  render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />}
                />
              </div>
              <div>
                <label className="label">وضعیت جوی</label>
                <select {...register('weather')} className="input">
                  <option value="">— انتخاب کنید —</option>
                  {Object.entries(WEATHER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">حداقل دما (°C)</label>
                  <input type="number" {...register('tempMin', { valueAsNumber: true })} className="input num" dir="ltr" />
                </div>
                <div>
                  <label className="label">حداکثر دما (°C)</label>
                  <input type="number" {...register('tempMax', { valueAsNumber: true })} className="input num" dir="ltr" />
                </div>
              </div>
            </div>
            <div>
              <label className="label">شرح عملیات روزانه</label>
              <textarea rows={4} {...register('operations')} className="input resize-none" placeholder="اقدامات انجام‌شده امروز..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">مشکلات اجرایی</label>
                <textarea rows={3} {...register('issues')} className="input resize-none" placeholder="موانع اجرایی..." />
              </div>
              <div>
                <label className="label">حوادث (در صورت وجود)</label>
                <textarea rows={3} {...register('incidents')} className="input resize-none" placeholder="حوادث یا مشکلات ایمنی..." />
              </div>
            </div>
          </div>
        )}

        {tab === 'workers' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> نیروی انسانی حاضر
              </h2>
              <button
                type="button"
                onClick={() => workersFA.append({
                  teamName: '', foreman: '', workerCount: 1,
                  workHours: 8, overtime: 0, status: 'PRESENT',
                })}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" /> افزودن اکیپ
              </button>
            </div>
            {workersFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                هیچ اکیپی ثبت نشده است
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2 w-10">#</th>
                      <th className="text-right px-2 py-2">نام اکیپ *</th>
                      <th className="text-right px-2 py-2 w-32">سرپرست</th>
                      <th className="text-center px-2 py-2 w-20">نفرات</th>
                      <th className="text-center px-2 py-2 w-20">ساعت</th>
                      <th className="text-center px-2 py-2 w-20">اضافه‌کار</th>
                      <th className="text-center px-2 py-2 w-28">وضعیت</th>
                      <th className="text-center px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workersFA.fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`workers.${idx}.teamName`)} className="input text-xs py-1.5" placeholder="مثال: اکیپ آرماتوربندی" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`workers.${idx}.foreman`)} className="input text-xs py-1.5" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" {...register(`workers.${idx}.workerCount`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.5" {...register(`workers.${idx}.workHours`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.5" {...register(`workers.${idx}.overtime`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <select {...register(`workers.${idx}.status`)} className="input text-xs py-1.5">
                            {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => workersFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'equipment' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> ماشین‌آلات فعال
              </h2>
              <button
                type="button"
                onClick={() => equipmentsFA.append({
                  name: '', plateNumber: '', operator: '',
                  hoursWorked: 0, status: 'ACTIVE',
                })}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {equipmentsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                هیچ ماشینی ثبت نشده است
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2 w-10">#</th>
                      <th className="text-right px-2 py-2">نام ماشین *</th>
                      <th className="text-right px-2 py-2 w-32">شماره</th>
                      <th className="text-right px-2 py-2 w-40">راننده</th>
                      <th className="text-center px-2 py-2 w-24">ساعت کار</th>
                      <th className="text-center px-2 py-2 w-32">وضعیت</th>
                      <th className="text-center px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipmentsFA.fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`equipments.${idx}.name`)} className="input text-xs py-1.5" placeholder="بیل مکانیکی، لودر..." />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`equipments.${idx}.plateNumber`)} className="input num text-xs py-1.5" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`equipments.${idx}.operator`)} className="input text-xs py-1.5" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.5" {...register(`equipments.${idx}.hoursWorked`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <select {...register(`equipments.${idx}.status`)} className="input text-xs py-1.5">
                            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => equipmentsFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'materials' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" /> مصالح وارده به کارگاه
              </h2>
              <button
                type="button"
                onClick={() => materialsFA.append({
                  itemName: '', unit: '', quantity: 1,
                  supplier: '', vehiclePlate: '', billNumber: '',
                })}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {materialsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                هیچ مصالحی ثبت نشده است
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2 w-10">#</th>
                      <th className="text-right px-2 py-2">نام کالا *</th>
                      <th className="text-center px-2 py-2 w-20">واحد</th>
                      <th className="text-center px-2 py-2 w-24">مقدار</th>
                      <th className="text-right px-2 py-2 w-40">تأمین‌کننده</th>
                      <th className="text-right px-2 py-2 w-32">ش. ماشین</th>
                      <th className="text-center px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materialsFA.fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`materials.${idx}.itemName`)} className="input text-xs py-1.5" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`materials.${idx}.unit`)} className="input text-xs py-1.5 text-center" placeholder="تن، عدد..." />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" {...register(`materials.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`materials.${idx}.supplier`)} className="input text-xs py-1.5" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="text" {...register(`materials.${idx}.vehiclePlate`)} className="input num text-xs py-1.5" dir="ltr" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => materialsFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'progress' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600" /> پیشرفت فیزیکی
              </h2>
              <button
                type="button"
                onClick={() => progressesFA.append({
                  wbsItemId: '', description: '', progressPct: 0,
                })}
                className="btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {progressesFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                هیچ پیشرفتی ثبت نشده است
              </div>
            ) : (
              <div className="space-y-3">
                {progressesFA.fields.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-lg border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <label className="label text-xs">ردیف WBS</label>
                        <select {...register(`progresses.${idx}.wbsItemId`)} className="input text-xs py-1.5">
                          <option value="">— انتخاب کنید —</option>
                          {wbsItems.map((w) => (
                            <option key={w.id} value={w.id}>{w.indent}{w.code} — {w.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-5">
                        <label className="label text-xs">شرح فعالیت *</label>
                        <input type="text" {...register(`progresses.${idx}.description`)} className="input text-xs py-1.5" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">درصد *</label>
                        <input type="number" step="0.01" min="0" max="100" {...register(`progresses.${idx}.progressPct`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="label text-xs">یادداشت</label>
                        <input type="text" {...register(`progresses.${idx}.notes`)} className="input text-xs py-1.5" />
                      </div>
                      <button type="button" onClick={() => progressesFA.remove(idx)} className="p-2 rounded hover:bg-red-50 text-red-600 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border">
            <button type="button" onClick={() => navigate('/site-ops/daily-reports')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره تغییرات' : 'ثبت گزارش'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
