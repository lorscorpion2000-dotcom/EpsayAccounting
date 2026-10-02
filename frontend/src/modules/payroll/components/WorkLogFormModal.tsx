import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { X, Save, Briefcase } from 'lucide-react';
import { payrollApi } from '../services/payroll.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { WorkLog, Employee } from '@/types/payroll';
import { ATTENDANCE_LABELS } from '@/types/payroll';
import type { Project } from '@/types/project';

interface Props {
  isOpen: boolean;
  editing?: WorkLog | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

export default function WorkLogFormModal({ isOpen, editing, employees, onClose, onSaved }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);

  const { register, handleSubmit, reset, control, watch } = useForm<any>({
    defaultValues: {
      workDate: new Date().toISOString().slice(0, 10),
      regularHours: 8,
      overtimeHours: 0,
      holidayHours: 0,
      status: 'PRESENT',
    },
  });

  const projectId = watch('projectId');

  useEffect(() => {
    if (!isOpen) return;
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);
    if (editing) {
      reset({
        employeeId: editing.employeeId,
        workDate: editing.workDate?.slice(0, 10),
        projectId: editing.projectId || '',
        wbsItemId: editing.wbsItemId || '',
        regularHours: Number(editing.regularHours),
        overtimeHours: Number(editing.overtimeHours),
        holidayHours: Number(editing.holidayHours),
        description: editing.description || '',
        status: editing.status,
      });
    } else {
      reset({
        employeeId: '', workDate: new Date().toISOString().slice(0, 10),
        projectId: '', wbsItemId: '',
        regularHours: 8, overtimeHours: 0, holidayHours: 0,
        status: 'PRESENT', description: '',
      });
    }
  }, [isOpen, editing, reset]);

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

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    if (!data.workDate) { toast.error('تاریخ الزامی'); return; }
    try {
      const payload = {
        employeeId: data.employeeId,
        workDate: data.workDate,
        projectId: data.projectId || undefined,
        wbsItemId: data.wbsItemId || undefined,
        regularHours: Number(data.regularHours) || 0,
        overtimeHours: Number(data.overtimeHours) || 0,
        holidayHours: Number(data.holidayHours) || 0,
        description: data.description || undefined,
        status: data.status,
      };
      if (editing) {
        await payrollApi.workLogs.update(editing.id, payload);
        toast.success('ویرایش شد');
      } else {
        await payrollApi.workLogs.create(payload);
        toast.success('ثبت شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {editing ? 'ویرایش کارکرد' : 'ثبت کارکرد'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="label">پرسنل *</label>
            <select {...register('employeeId', { required: true })} className="input" disabled={!!editing}>
              <option value="">— انتخاب کنید —</option>
              {employees.map((e) => <option key={e.id} value={e.partnerId}>{e.partner?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">تاریخ *</label>
            <Controller name="workDate" control={control}
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه</label>
              <select {...register('projectId')} className="input">
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">ردیف WBS</label>
              <select {...register('wbsItemId')} className="input" disabled={!projectId}>
                <option value="">—</option>
                {wbsItems.map((w) => <option key={w.id} value={w.id}>{w.indent}{w.code} — {w.title}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">ساعت عادی</label>
              <input type="number" step="0.5" {...register('regularHours')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">اضافه‌کار</label>
              <input type="number" step="0.5" {...register('overtimeHours')} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">تعطیلات</label>
              <input type="number" step="0.5" {...register('holidayHours')} className="input num" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="label">وضعیت</label>
            <select {...register('status')} className="input">
              {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">شرح فعالیت</label>
            <textarea rows={2} {...register('description')} className="input resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4" />
              {editing ? 'ذخیره' : 'ثبت'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
