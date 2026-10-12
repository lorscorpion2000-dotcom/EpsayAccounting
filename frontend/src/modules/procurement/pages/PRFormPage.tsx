import { useEffect, useState } from 'react';
import UnitSelect from '@/components/UnitSelect';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { procurementApi } from '../services/procurement.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project } from '@/types/project';
import { PR_PRIORITY_LABELS, PRPriority, PRItemUnit } from '@/types/procurement';
import { todayLocalISO } from '@/utils/local-date';

interface ItemForm {
  description: string;
  quantity: number;
  unit: PRItemUnit;
  priority: PRPriority;
  notes?: string;
}

interface FormData {
  projectId: string;
  wbsItemId?: string;
  requestDate?: string;
  requiredDate?: string;
  department?: string;
  deliveryLocation?: string;
  reason?: string;
  items: ItemForm[];
}

export default function PRFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      requestDate: todayLocalISO(),
      items: [{ description: '', quantity: 1, unit: 'NUMBER', priority: 'NORMAL' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const projectId = watch('projectId');

  useEffect(() => {
    setLoadingData(true);
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([p]) => {
      setProjects(p);
      if (isEdit && id) {
        procurementApi.pr.get(id).then((pr) => {
          reset({
            projectId: pr.projectId,
            wbsItemId: pr.wbsItemId || undefined,
            requestDate: pr.requestDate?.slice(0, 10),
            requiredDate: pr.requiredDate?.slice(0, 10),
            department: pr.department || undefined,
            deliveryLocation: pr.deliveryLocation || undefined,
            reason: pr.reason || undefined,
            items: (pr.items || []).map((it) => ({
              description: it.description,
              quantity: Number(it.quantity),
              unit: it.unit,
              priority: it.priority,
              notes: it.notes || undefined,
            })),
          });
        }).catch(() => toast.error('خطا در بارگذاری'));
      }
    }).finally(() => setLoadingData(false));
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
    if (!data.items || data.items.length === 0) {
      toast.error('حداقل یک قلم اضافه کنید');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...data,
        requestDate: data.requestDate,
        requiredDate: data.requiredDate || undefined,
        wbsItemId: data.wbsItemId || undefined,
        items: data.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          priority: it.priority,
          notes: it.notes || undefined,
        })),
      };
      if (isEdit && id) {
        await procurementApi.pr.update(id, payload);
        toast.success('درخواست ویرایش شد');
      } else {
        await procurementApi.pr.create(payload);
        toast.success('درخواست ایجاد شد');
      }
      navigate('/procurement/requests');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره‌سازی');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-600" />
            {isEdit ? 'ویرایش درخواست خرید' : 'درخواست خرید جدید'}
          </h1>
        </div>
        <button onClick={() => navigate('/procurement/requests')} className="btn-ghost">
          <X className="w-4 h-4" /> انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4">اطلاعات درخواست</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select {...register('projectId', { required: 'پروژه الزامی است' })} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.projectId && <p className="text-xs text-red-500 mt-1">{errors.projectId.message}</p>}
            </div>
            <div>
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">— انتخاب کنید —</option>
                {wbsItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.indent}{it.code} — {it.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاریخ درخواست *</label>
              <Controller
                name="requestDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div>
              <label className="label">تاریخ مورد نیاز</label>
              <Controller
                name="requiredDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker value={field.value} onChange={field.onChange} placeholder="اختیاری" />
                )}
              />
            </div>
            <div>
              <label className="label">واحد درخواست‌کننده</label>
              <input type="text" {...register('department')} className="input" placeholder="مثال: دفتر فنی، کارگاه" />
            </div>
            <div>
              <label className="label">محل تحویل</label>
              <input type="text" {...register('deliveryLocation')} className="input" placeholder="مثال: انبار کارگاه" />
            </div>
            <div className="md:col-span-2">
              <label className="label">دلیل خرید</label>
              <textarea rows={2} {...register('reason')} className="input resize-none" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">اقلام درخواستی</h2>
            <button
              type="button"
              onClick={() => append({ description: '', quantity: 1, unit: 'NUMBER', priority: 'NORMAL' })}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4" /> افزودن قلم
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-2 py-2 font-medium text-slate-600 w-10">#</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600">شرح کالا/خدمت *</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-24">مقدار</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-28">واحد</th>
                  <th className="text-right px-2 py-2 font-medium text-slate-600 w-28">اولویت</th>
                  <th className="text-center px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((f, idx) => (
                  <tr key={f.id}>
                    <td className="px-2 py-2 text-center text-slate-500 num">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        {...register(`items.${idx}.description`, { required: true })}
                        className="input text-xs py-1.5"
                        placeholder="شرح..."
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        className="input num text-xs py-1.5"
                        dir="ltr"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <UnitSelect registerProps={register(`items.${idx}.unit`)} className="input text-xs py-1.5" />
                    </td>
                    <td className="px-2 py-2">
                      <select {...register(`items.${idx}.priority`)} className="input text-xs py-1.5">
                        {Object.entries(PR_PRIORITY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border border-slate-200">
            <button type="button" onClick={() => navigate('/procurement/requests')} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'ذخیره' : 'ثبت درخواست'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
