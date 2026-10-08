import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Save, X, Loader2, Plus, Trash2, ClipboardList,
  Users, Truck, Package, TrendingUp, Cloud, AlertCircle,
  UserCheck, ShoppingCart, Bell,
} from 'lucide-react';
import clsx from 'clsx';
import { siteOpsApi } from '../services/site-ops.api';
import { warehouseApi } from '@/modules/warehouse/services/warehouse.api';
import { ITEM_UNIT_LABELS } from '@/types/warehouse';
import { partnersApi } from '@/modules/partners/services/partners.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type { Project } from '@/types/project';
import {
  WEATHER_LABELS, ATTENDANCE_LABELS, EQUIPMENT_STATUS_LABELS,
  ENTRY_EXIT_KIND_LABELS, REQUEST_TYPE_LABELS, REQUEST_PRIORITY_LABELS,
  EVENT_TYPE_LABELS, EVENT_SEVERITY_LABELS,
  WeatherCondition, AttendanceStatus, EquipmentStatus,
  EntryExitKind, RequestType, EventType,
} from '@/types/site-ops';

type Tab =
  | 'general' | 'workers' | 'equipment' | 'materials' | 'progress'
  | 'entryExits' | 'requests' | 'events';

interface FormData {
  projectId: string;
  reportDate?: string;
  weather?: WeatherCondition;
  tempMin?: number;
  tempMax?: number;
  startTime?: string;
  endTime?: string;
  operations?: string;
  issues?: string;
  incidents?: string;
  workers: any[];
  equipments: any[];
  materials: any[];
  progresses: any[];
  entryExits: any[];
  requests: any[];
  events: any[];
}

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const UNIT_FA_BY_EN: Record<string, string> = {
  NUMBER: 'عدد',
  KILOGRAM: 'کیلوگرم',
  TON: 'تن',
  METER: 'متر',
  SQUARE_METER: 'مترمربع',
  CUBIC_METER: 'مترمکعب',
  LITER: 'لیتر',
  PACKAGE: 'بسته',
  SERVICE: 'سرویس',
  LUMP_SUM: 'مقطوع',
};

const UNIT_FA_LIST = [
  'عدد', 'کیلوگرم', 'تن', 'متر', 'مترمربع', 'مترمکعب',
  'لیتر', 'بسته', 'سرویس', 'مقطوع',
];

function toFaUnit(u: string | null | undefined): string {
  if (!u) return '';
  return UNIT_FA_BY_EN[u] || u;
}

export default function DailyReportFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [tab, setTab] = useState<Tab>('general');
  const [projects, setProjects] = useState<Project[]>([]);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [itemList, setItemList] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [pettyCashAccountList, setPettyCashAccountList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      reportDate: todayISO(),
      workers: [], equipments: [], materials: [], progresses: [],
      entryExits: [], requests: [], events: [],
    },
  });

  const workersFA     = useFieldArray({ control, name: 'workers' });
  const equipmentsFA  = useFieldArray({ control, name: 'equipments' });
  const materialsFA   = useFieldArray({ control, name: 'materials' });
  const progressesFA  = useFieldArray({ control, name: 'progresses' });
  const entryExitsFA  = useFieldArray({ control, name: 'entryExits' });
  const requestsFA    = useFieldArray({ control, name: 'requests' });
  const eventsFA      = useFieldArray({ control, name: 'events' });

  const projectId = watch('projectId');

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => []);
    api.get('/equipment', { params: { isActive: true } }).then((r) => setEquipmentList(r.data)).catch(() => []);

    if (isEdit && id) {
      siteOpsApi.reports.get(id).then((r: any) => {
        reset({
          projectId: r.projectId,
          reportDate: r.reportDate?.slice(0, 10),
          weather: r.weather || undefined,
          tempMin: r.tempMin ?? undefined,
          tempMax: r.tempMax ?? undefined,
          startTime: r.startTime || undefined,
          endTime: r.endTime || undefined,
          operations: r.operations || undefined,
          issues: r.issues || undefined,
          incidents: r.incidents || undefined,
          workers: (r.workers || []).map((w: any) => ({
            teamName: w.teamName, foreman: w.foreman, workerCount: w.workerCount,
            workHours: Number(w.workHours), overtime: Number(w.overtime),
            status: w.status, wbsItemId: w.wbsItemId, description: w.description,
          })),
          equipments: (r.equipments || []).map((e: any) => ({
            name: e.name, plateNumber: e.plateNumber, operator: e.operator,
            hoursWorked: Number(e.hoursWorked), status: e.status,
            wbsItemId: e.wbsItemId, fuelLiters: Number(e.fuelLiters || 0),
            stopReason: e.stopReason, description: e.description,
          })),
          materials: (r.materials || []).map((m: any) => ({
            itemName: m.itemName, unit: toFaUnit(m.unit), quantity: Number(m.quantity),
            supplier: m.supplier, vehiclePlate: m.vehiclePlate, billNumber: m.billNumber,
            movementType: m.movementType, qcResult: m.qcResult,
            exitType: m.exitType, exitDest: m.exitDest, description: m.description,
          })),
          progresses: (r.progresses || []).map((p: any) => ({
            wbsItemId: p.wbsItemId, description: p.description,
            progressPct: Number(p.progressPct),
            quantity: p.quantity ? Number(p.quantity) : undefined,
            location: p.location, notes: p.notes,
          })),
          entryExits: (r.entryExits || []).map((e: any) => ({
            kind: e.kind, personName: e.personName, organization: e.organization,
            purpose: e.purpose, vehicleType: e.vehicleType, plateNumber: e.plateNumber,
            driverName: e.driverName, cargo: e.cargo, entryTime: e.entryTime,
            exitTime: e.exitTime, notes: e.notes,
          })),
          requests: (r.requests || []).map((rq: any) => ({
            requestType: rq.requestType, title: rq.title, description: rq.description,
            quantity: rq.quantity ? Number(rq.quantity) : undefined,
            unit: toFaUnit(rq.unit), priority: rq.priority,
            requiredDate: rq.requiredDate?.slice(0, 10) || undefined,
            wbsItemId: rq.wbsItemId,
            amount: rq.amount ? Number(rq.amount) : undefined,
          })),
          events: (r.events || []).map((ev: any) => ({
            eventType: ev.eventType, title: ev.title, description: ev.description,
            startTime: ev.startTime, endTime: ev.endTime,
            durationHrs: ev.durationHrs ? Number(ev.durationHrs) : undefined,
            severity: ev.severity, actorName: ev.actorName,
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
      const payload: any = { ...data, weather: data.weather || undefined };
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
    } finally { setLoading(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>;
  }

  const TABS = [
    { key: 'general',   label: 'عمومی',         icon: Cloud,         count: undefined },
    { key: 'workers',   label: 'نیروی انسانی', icon: Users,         count: workersFA.fields.length },
    { key: 'equipment', label: 'ماشین‌آلات',   icon: Truck,         count: equipmentsFA.fields.length },
    { key: 'materials', label: 'مصالح',        icon: Package,       count: materialsFA.fields.length },
    { key: 'progress',  label: 'پیشرفت',       icon: TrendingUp,    count: progressesFA.fields.length },
    { key: 'entryExits', label: 'ورود/خروج',   icon: UserCheck,     count: entryExitsFA.fields.length },
    { key: 'requests',  label: 'درخواست‌ها',    icon: ShoppingCart,  count: requestsFA.fields.length },
    { key: 'events',    label: 'تحولات',       icon: Bell,          count: eventsFA.fields.length },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
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
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} type="button" onClick={() => setTab(t.key as Tab)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    tab === t.key
                      ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                  )}>
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

        {/* ═══ General ═══ */}
        {tab === 'general' && (
          <div className="card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">پروژه *</label>
                <select {...register('projectId', { required: true })} className="input" disabled={isEdit}>
                  <option value="">— انتخاب کنید —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">تاریخ گزارش *</label>
                <Controller name="reportDate" control={control}
                  render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
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
              <div>
                <label className="label">ساعت شروع کار</label>
                <input type="time" {...register('startTime')} className="input num" dir="ltr" />
              </div>
              <div>
                <label className="label">ساعت پایان کار</label>
                <input type="time" {...register('endTime')} className="input num" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">حداقل دما</label>
                  <input type="number" {...register('tempMin', { valueAsNumber: true })} className="input num" dir="ltr" />
                </div>
                <div>
                  <label className="label">حداکثر دما</label>
                  <input type="number" {...register('tempMax', { valueAsNumber: true })} className="input num" dir="ltr" />
                </div>
              </div>
            </div>
            <div>
              <label className="label">شرح عملیات روزانه</label>
              <textarea rows={3} {...register('operations')} className="input resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">مشکلات اجرایی</label>
                <textarea rows={3} {...register('issues')} className="input resize-none" />
              </div>
              <div>
                <label className="label">حوادث (در صورت وجود)</label>
                <textarea rows={3} {...register('incidents')} className="input resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ Workers ═══ */}
        {tab === 'workers' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> نیروی انسانی
              </h2>
              <button type="button" onClick={() => workersFA.append({
                teamName: '', foreman: '', workerCount: 1, workHours: 8, overtime: 0, status: 'PRESENT',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {workersFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ اکیپی ثبت نشده</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2 w-10">#</th>
                      <th className="text-right px-2 py-2 min-w-[160px]">پرسنل</th>
                      <th className="text-right px-2 py-2 min-w-[140px]">نام اکیپ *</th>
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
                        <td className="px-2 py-2 text-center text-slate-500 num text-xs align-top">{idx + 1}</td>
                        <td className="px-2 py-2 space-y-1">
                          <select
                            value={(f as any).employeeId || ''}
                            onChange={(e) => {
                              const empId = e.target.value;
                              const sel = employeeList.find((x: any) => x.id === empId);
                              setValue(`workers.${idx}.employeeId`, empId);
                              if (sel) setValue(`workers.${idx}.teamName`, sel.name);
                            }}
                            className="input text-xs py-1.5"
                          >
                            <option value="">— پرسنل —</option>
                            {employeeList.map((emp: any) => (
                              <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2"><input type="text" {...register(`workers.${idx}.teamName`)} className="input text-xs py-1.5" /></td>
                        <td className="px-2 py-2"><input type="text" {...register(`workers.${idx}.foreman`)} className="input text-xs py-1.5" /></td>
                        <td className="px-2 py-2"><input type="number" {...register(`workers.${idx}.workerCount`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2"><input type="number" step="0.5" {...register(`workers.${idx}.workHours`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2"><input type="number" step="0.5" {...register(`workers.${idx}.overtime`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2">
                          <select {...register(`workers.${idx}.status`)} className="input text-xs py-1.5">
                            {Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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

        {/* ═══ Equipment ═══ */}
        {tab === 'equipment' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> ماشین‌آلات
              </h2>
              <button type="button" onClick={() => equipmentsFA.append({
                name: '', plateNumber: '', operator: '', hoursWorked: 0,
                status: 'ACTIVE', fuelLiters: 0, stopReason: '',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {equipmentsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ ماشینی ثبت نشده</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2 w-10">#</th>
                      <th className="text-right px-2 py-2">نام ماشین *</th>
                      <th className="text-right px-2 py-2 w-28">پلاک</th>
                      <th className="text-right px-2 py-2 w-32">راننده</th>
                      <th className="text-center px-2 py-2 w-20">ساعت</th>
                      <th className="text-center px-2 py-2 w-20">سوخت (ل)</th>
                      <th className="text-center px-2 py-2 w-28">وضعیت</th>
                      <th className="text-right px-2 py-2 w-40">علت توقف</th>
                      <th className="text-center px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipmentsFA.fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-2 py-2 text-center text-slate-500 num text-xs">{idx + 1}</td>
                        <td className="px-2 py-2 space-y-1"><select value={(f as any).equipmentId || ''} onChange={(e) => { const eqId = e.target.value; const sel = equipmentList.find((x: any) => x.id === eqId); setValue(`equipments.${idx}.equipmentId`, eqId); if (sel) { setValue(`equipments.${idx}.name`, sel.name); setValue(`equipments.${idx}.plateNumber`, sel.plateNumber || ''); setValue(`equipments.${idx}.operator`, sel.operator || ''); } }} className="input text-xs py-1.5"><option value="">— از شناسنامه —</option>{equipmentList.map((eq: any) => (<option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>))}</select><input type="text" {...register(`equipments.${idx}.name`)} className="input text-xs py-1.5" placeholder="یا دستی..." /></td>
                        <td className="px-2 py-2"><input type="text" {...register(`equipments.${idx}.plateNumber`)} className="input num text-xs py-1.5" dir="ltr" /></td>
                        <td className="px-2 py-2"><input type="text" {...register(`equipments.${idx}.operator`)} className="input text-xs py-1.5" /></td>
                        <td className="px-2 py-2"><input type="number" step="0.5" {...register(`equipments.${idx}.hoursWorked`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2"><input type="number" step="0.1" {...register(`equipments.${idx}.fuelLiters`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2">
                          <select {...register(`equipments.${idx}.status`)} className="input text-xs py-1.5">
                            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2"><input type="text" {...register(`equipments.${idx}.stopReason`)} className="input text-xs py-1.5" /></td>
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

        {/* ═══ Materials ═══ */}
        {tab === 'materials' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" /> مصالح (ورود / مصرف / خروج)
              </h2>
              <button type="button" onClick={() => materialsFA.append({
                itemName: '', unit: '', quantity: 1, supplier: '', vehiclePlate: '',
                billNumber: '', movementType: 'IN', qcResult: 'ACCEPTED',
                exitType: '', exitDest: '', description: '',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {materialsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ مصالحی ثبت نشده</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '1080px' }}>
                  <colgroup>
                    <col style={{ width: '40px' }} />
                    <col style={{ width: '240px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '50px' }} />
                  </colgroup>
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-center px-2 py-2">#</th>
                      <th className="text-right px-2 py-2">کالا *</th>
                      <th className="text-right px-2 py-2">انبار</th>
                      <th className="text-center px-2 py-2">واحد</th>
                      <th className="text-center px-2 py-2">مقدار</th>
                      <th className="text-center px-2 py-2">نوع</th>
                      <th className="text-right px-2 py-2">تأمین‌کننده</th>
                      <th className="text-center px-2 py-2">کیفیت</th>
                      <th className="text-center px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materialsFA.fields.map((f, idx) => (
                      <tr key={f.id}>
                        <td className="px-2 py-2 text-center text-slate-500 num text-xs">{idx + 1}</td>
                        <td className="px-2 py-2 align-top">
                          <select
                            value={(f as any).itemId || ''}
                            onChange={(e) => {
                              const itId = e.target.value;
                              const sel = itemList.find((x: any) => x.id === itId);
                              setValue(`materials.${idx}.itemId`, itId);
                              if (sel) {
                                setValue(`materials.${idx}.itemName`, sel.name);
                                setValue(`materials.${idx}.unit`, toFaUnit(sel.unit));
                              }
                            }}
                            className="input text-xs py-1.5"
                          >
                            <option value="">— کالا از انبار —</option>
                            {itemList.map((it: any) => (
                              <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select
                            value={(f as any).warehouseId || ''}
                            onChange={(e) => setValue(`materials.${idx}.warehouseId`, e.target.value)}
                            className="input text-xs py-1.5"
                          >
                            <option value="">— انبار —</option>
                            {warehouseList.map((wh: any) => (
                              <option key={wh.id} value={wh.id}>{wh.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select {...register(`materials.${idx}.unit`)} className="input text-xs py-1.5">
                            <option value="">— واحد —</option>
                            {UNIT_FA_LIST.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top"><input type="number" step="0.01" {...register(`materials.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" /></td>
                        <td className="px-2 py-2 align-top">
                          <select {...register(`materials.${idx}.movementType`)} className="input text-xs py-1.5">
                            <option value="IN">ورود</option>
                            <option value="CONSUMPTION">مصرف</option>
                            <option value="OUT">خروج</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top"><input type="text" {...register(`materials.${idx}.supplier`)} className="input text-xs py-1.5" /></td>
                        <td className="px-2 py-2 align-top">
                          <select {...register(`materials.${idx}.qcResult`)} className="input text-xs py-1.5">
                            <option value="ACCEPTED">قبول</option>
                            <option value="CONDITIONAL">مشروط</option>
                            <option value="REJECTED">رد</option>
                          </select>
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

        {/* ═══ Progress ═══ */}
        {tab === 'progress' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600" /> پیشرفت فیزیکی
              </h2>
              <button type="button" onClick={() => progressesFA.append({
                wbsItemId: '', description: '', progressPct: 0, quantity: undefined, location: '', notes: '',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {progressesFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ پیشرفتی ثبت نشده</div>
            ) : (
              <div className="space-y-3">
                {progressesFA.fields.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-lg border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-4">
                        <label className="label text-xs">ردیف WBS</label>
                        <select {...register(`progresses.${idx}.wbsItemId`)} className="input text-xs py-1.5">
                          <option value="">— انتخاب کنید —</option>
                          {wbsItems.map((w) => <option key={w.id} value={w.id}>{w.indent}{w.code} — {w.title}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <label className="label text-xs">شرح فعالیت *</label>
                        <input type="text" {...register(`progresses.${idx}.description`)} className="input text-xs py-1.5" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">درصد *</label>
                        <input type="number" step="0.01" min="0" max="100" {...register(`progresses.${idx}.progressPct`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">مقدار</label>
                        <input type="number" step="0.01" {...register(`progresses.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="label text-xs">محل</label>
                        <input type="text" {...register(`progresses.${idx}.location`)} className="input text-xs py-1.5" />
                      </div>
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

        {/* ═══ Entry/Exit ═══ */}
        {tab === 'entryExits' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" /> ورود و خروج کارگاه
              </h2>
              <button type="button" onClick={() => entryExitsFA.append({
                kind: 'PERSON', personName: '', organization: '', purpose: '',
                vehicleType: '', plateNumber: '', driverName: '', cargo: '',
                entryTime: '', exitTime: '', notes: '',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </div>
            {entryExitsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ ورود/خروجی ثبت نشده</div>
            ) : (
              <div className="space-y-3">
                {entryExitsFA.fields.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs">نوع *</label>
                        <select {...register(`entryExits.${idx}.kind`)} className="input text-xs py-1.5">
                          {Object.entries(ENTRY_EXIT_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">نام / سازمان</label>
                        <input type="text" {...register(`entryExits.${idx}.personName`)} className="input text-xs py-1.5" placeholder="نام یا نوع خودرو" />
                      </div>
                      <div>
                        <label className="label text-xs">ساعت ورود</label>
                        <input type="time" {...register(`entryExits.${idx}.entryTime`)} className="input num text-xs py-1.5" dir="ltr" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="label text-xs">هدف / بار</label>
                        <input type="text" {...register(`entryExits.${idx}.purpose`)} className="input text-xs py-1.5" />
                      </div>
                      <div>
                        <label className="label text-xs">ساعت خروج</label>
                        <input type="time" {...register(`entryExits.${idx}.exitTime`)} className="input num text-xs py-1.5" dir="ltr" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button type="button" onClick={() => entryExitsFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Requests ═══ */}
        {tab === 'requests' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" /> درخواست‌ها
              </h2>
              <button type="button" onClick={() => requestsFA.append({
                requestType: 'PURCHASE', title: '', description: '',
                quantity: undefined, unit: '', priority: 'NORMAL',
                requiredDate: '', wbsItemId: '', amount: undefined,
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن درخواست
              </button>
            </div>
            {requestsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ درخواستی ثبت نشده</div>
            ) : (
              <div className="space-y-3">
                {requestsFA.fields.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs">نوع درخواست *</label>
                        <select {...register(`requests.${idx}.requestType`)} className="input text-xs py-1.5">
                          {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">عنوان *</label>
                        <input type="text" {...register(`requests.${idx}.title`)} className="input text-xs py-1.5" />
                      </div>
                      <div>
                        <label className="label text-xs">اولویت</label>
                        <select {...register(`requests.${idx}.priority`)} className="input text-xs py-1.5">
                          {Object.entries(REQUEST_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="label text-xs">توضیحات</label>
                        <input type="text" {...register(`requests.${idx}.description`)} className="input text-xs py-1.5" />
                      </div>
                      <div>
                        <label className="label text-xs">مقدار / واحد</label>
                        <div className="flex gap-1">
                          <input type="number" {...register(`requests.${idx}.quantity`, { valueAsNumber: true })} className="input num text-xs py-1.5" dir="ltr" />
                          <select {...register(`requests.${idx}.unit`)} className="input text-xs py-1.5 w-24">
                            <option value="">— واحد —</option>
                            {UNIT_FA_LIST.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">تاریخ نیاز</label>
                        <Controller name={`requests.${idx}.requiredDate`} control={control}
                          render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} />} />
                      </div>
                      <div>
                        <label className="label text-xs">مبلغ تقریبی</label>
                        <input type="number" {...register(`requests.${idx}.amount`, { valueAsNumber: true })} className="input num text-xs py-1.5" dir="ltr" />
                        <select
                          value={(f as any).pettyCashAccountId || ''}
                          onChange={(e) => setValue(`requests.${idx}.pettyCashAccountId`, e.target.value)}
                          className="input text-xs py-1.5"
                          title="حساب تنخواه (برای درخواست وجه)"
                        >
                          <option value="">— تنخواه —</option>
                          {pettyCashAccountList.map((pca: any) => (
                            <option key={pca.id} value={pca.id}>{pca.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button type="button" onClick={() => requestsFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Events ═══ */}
        {tab === 'events' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" /> تحولات و رویدادها
              </h2>
              <button type="button" onClick={() => eventsFA.append({
                eventType: 'STOP', title: '', description: '',
                startTime: '', endTime: '', durationHrs: undefined,
                severity: 'LOW', actorName: '',
              })} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> افزودن رویداد
              </button>
            </div>
            {eventsFA.fields.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">هیچ رویدادی ثبت نشده</div>
            ) : (
              <div className="space-y-3">
                {eventsFA.fields.map((f, idx) => (
                  <div key={f.id} className="p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs">نوع *</label>
                        <select {...register(`events.${idx}.eventType`)} className="input text-xs py-1.5">
                          {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="label text-xs">عنوان *</label>
                        <input type="text" {...register(`events.${idx}.title`)} className="input text-xs py-1.5" />
                      </div>
                      <div className="md:col-span-4">
                        <label className="label text-xs">شرح</label>
                        <textarea rows={2} {...register(`events.${idx}.description`)} className="input text-xs py-1.5 resize-none" />
                      </div>
                      <div>
                        <label className="label text-xs">ساعت شروع</label>
                        <input type="time" {...register(`events.${idx}.startTime`)} className="input num text-xs py-1.5" dir="ltr" />
                      </div>
                      <div>
                        <label className="label text-xs">ساعت پایان</label>
                        <input type="time" {...register(`events.${idx}.endTime`)} className="input num text-xs py-1.5" dir="ltr" />
                      </div>
                      <div>
                        <label className="label text-xs">مدت (ساعت)</label>
                        <input type="number" step="0.5" {...register(`events.${idx}.durationHrs`, { valueAsNumber: true })} className="input num text-xs py-1.5" dir="ltr" />
                      </div>
                      <div>
                        <label className="label text-xs">شدت</label>
                        <select {...register(`events.${idx}.severity`)} className="input text-xs py-1.5">
                          {Object.entries(EVENT_SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button type="button" onClick={() => eventsFA.remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
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
