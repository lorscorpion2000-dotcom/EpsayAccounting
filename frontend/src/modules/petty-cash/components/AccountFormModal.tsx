import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Loader2, Save, Wallet } from 'lucide-react';
import { pettyCashApi } from '../services/petty-cash.api';
import { api } from '@/services/api';
import type { PettyCashAccount } from '@/types/petty-cash';
import type { Project } from '@/types/project';
import { formatNumber } from '@/utils/format';

interface Props {
  isOpen: boolean;
  editingAccount?: PettyCashAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  employeeId: string;
  projectId?: string;
  ceilingPerTx: number;
  weeklyLimit: number;
  isActive: boolean;
  description?: string;
}

export default function AccountFormModal({
  isOpen, editingAccount, onClose, onSaved,
}: Props) {
  const isEdit = !!editingAccount;
  const [employees, setEmployees] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      ceilingPerTx: 200000000,
      weeklyLimit: 300000000,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get('/payroll/employees').then((r) => r.data).catch(() => []),
        api.get('/partners').then((r) => r.data).catch(() => []),
      api.get('/projects').then((r) => r.data).catch(() => []),
    ]).then(([e, p, proj]) => {
      setEmployees(Array.isArray(e) ? e : []);
      setPartners(Array.isArray(p) ? p.filter((x: any) => x.type === 'EMPLOYEE') : []);
      setProjects(Array.isArray(proj) ? proj : []);
    });

    if (editingAccount) {
      reset({
        name: editingAccount.name,
        employeeId: editingAccount.employeeId
        ? 'emp:' + editingAccount.employeeId
        : (editingAccount as any).partnerId
        ? 'par:' + (editingAccount as any).partnerId
        : '',
        projectId: editingAccount.projectId || undefined,
        ceilingPerTx: Number(editingAccount.ceilingPerTx),
        weeklyLimit: Number(editingAccount.weeklyLimit),
        isActive: editingAccount.isActive,
        description: editingAccount.description || undefined,
      });
    } else {
      reset({
        name: '',
        employeeId: '',
        projectId: undefined,
        ceilingPerTx: 200000000,
        weeklyLimit: 300000000,
        isActive: true,
        description: undefined,
      });
    }
  }, [isOpen, editingAccount, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    try {
      // تجزیه holder key
      const hk = (data.employeeId as string) || '';
      const payload: any = {
        ...data,
        ceilingPerTx: Number(data.ceilingPerTx),
        weeklyLimit: Number(data.weeklyLimit),
        projectId: data.projectId || undefined,
      };
      // حذف مقادیر ترکیبی اولیه
      delete payload.employeeId;
      delete payload.partnerId;
      if (hk.startsWith('emp:') && hk.length > 4) payload.employeeId = hk.slice(4);
      else if (hk.startsWith('par:') && hk.length > 4) payload.partnerId = hk.slice(4);
      if (isEdit && editingAccount) {
        await pettyCashApi.accounts.update(editingAccount.id, payload);
        toast.success('حساب تنخواه به‌روزرسانی شد');
      } else {
        await pettyCashApi.accounts.create(payload);
        toast.success('حساب تنخواه ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا در ذخیره‌سازی');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEdit ? 'ویرایش حساب تنخواه' : 'حساب تنخواه جدید'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">تعریف حساب و سقف‌های مجاز</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">نام حساب *</label>
            <input
              type="text"
              {...register('name', { required: 'نام الزامی است' })}
              className="input"
              placeholder="مثال: تنخواه کارگاه بیمارستان شفا"
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">تنخواه‌دار *</label>
            <select {...register('employeeId', { required: 'تنخواه‌دار الزامی است' })} className="input w-full">
            <option value="">— انتخاب کنید —</option>
            {employees.length > 0 && (
              <optgroup label="پرسنل">
                {employees.map((u) => (
                  <option key={'emp:' + u.id} value={'emp:' + u.id}>
                    {u.fullName}{u.code ? ' (' + u.code + ')' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {partners.length > 0 && (
              <optgroup label="اشخاص">
                {partners.map((p) => (
                  <option key={'par:' + p.id} value={'par:' + p.id}>
                    {p.name}{p.code ? ' (' + p.code + ')' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
            {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>}
          </div>

          <div>
            <label className="label">پروژه مرتبط</label>
            <select {...register('projectId')} className="input">
              <option value="">— عمومی (بدون پروژه) —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">سقف هر خرید (ریال) *</label>
              <input
                type="number"
                step="1000000"
                {...register('ceilingPerTx', { required: true, valueAsNumber: true })}
                className="input num"
                dir="ltr"
              />
              <p className="text-xs text-slate-500 mt-1">
                پیش‌فرض: ۲۰۰ میلیون ریال
              </p>
            </div>
            <div>
              <label className="label">سقف هفتگی (ریال) *</label>
              <input
                type="number"
                step="1000000"
                {...register('weeklyLimit', { required: true, valueAsNumber: true })}
                className="input num"
                dir="ltr"
              />
              <p className="text-xs text-slate-500 mt-1">
                پیش‌فرض: ۳۰۰ میلیون ریال
              </p>
            </div>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea
              rows={2}
              {...register('description')}
              className="input resize-none"
              placeholder="توضیحات اضافی..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isActive')}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700">حساب فعال است</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {isEdit ? 'ذخیره تغییرات' : 'ایجاد حساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
