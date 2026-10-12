import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Truck, Edit, Plus, Clock, Fuel, Wrench, CircleDollarSign } from 'lucide-react';
import clsx from 'clsx';
import { equipmentApi } from '../services/equipment.api';
import type {
  Equipment, EquipmentDailyLog, EquipmentMaintenance,
} from '@/types/equipment';
import {
  EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_OWNERSHIP_LABELS, MAINTENANCE_TYPE_LABELS,
  EQUIPMENT_LOG_STATUS_LABELS, EQUIPMENT_LOG_STATUS_COLORS,
} from '@/types/equipment';
import { formatJalaliDate, toPersianDigits } from '@/utils/format';

type Tab = 'info' | 'logs' | 'maintenances';

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [logs, setLogs] = useState<EquipmentDailyLog[]>([]);
  const [maintenances, setMaintenances] = useState<EquipmentMaintenance[]>([]);
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      equipmentApi.equipment.get(id),
      equipmentApi.logs.list({ equipmentId: id }),
      equipmentApi.maintenances.list({ equipmentId: id }),
    ])
      .then(([eq, lg, mt]) => {
        setEquipment(eq);
        setLogs(lg);
        setMaintenances(mt);
      })
      .catch(() => toast.error('خطا در بارگذاری'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!equipment) return null;

  // Aggregated stats
  const totalWork = logs.reduce((s, l) => s + Number(l.workHours), 0);
  const totalFuel = logs.reduce((s, l) => s + Number(l.fuelLiters), 0);
  const totalCost = logs.reduce((s, l) => s + Number(l.computedCost), 0);
  const totalMaintenanceCost = maintenances.reduce((s, m) => s + Number(m.cost), 0);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'info', label: 'اطلاعات' },
    { key: 'logs', label: 'کارکرد روزانه', count: logs.length },
    { key: 'maintenances', label: 'تعمیرات', count: maintenances.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 no-print">
        <button
          onClick={() => navigate('/equipment')}
          className="hover:text-brand-600 flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" /> ماشین‌آلات
        </button>
        <span>/</span>
        <span className="text-slate-800 font-medium num" dir="ltr">
          {equipment.code}
        </span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-800">{equipment.name}</h1>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md', EQUIPMENT_STATUS_COLORS[equipment.status])}>
                  {EQUIPMENT_STATUS_LABELS[equipment.status]}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                  {EQUIPMENT_OWNERSHIP_LABELS[equipment.ownership]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="num text-xs font-mono" dir="ltr">{equipment.code}</span>
                {equipment.brand && <span>{equipment.brand} {equipment.model}</span>}
                {equipment.plateNumber && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="num" dir="ltr">{equipment.plateNumber}</span>
                  </>
                )}
                {equipment.currentProject && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{equipment.currentProject.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/equipment/${equipment.id}/edit`)}
          >
            <Edit className="w-4 h-4" /> ویرایش
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ساعت کارکرد</div>
              <div className="font-bold num">{toPersianDigits(totalWork.toFixed(1))}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">مصرف سوخت (لیتر)</div>
              <div className="font-bold num">{toPersianDigits(totalFuel.toFixed(1))}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">هزینه کارکرد</div>
              <div className="font-bold num">{toPersianDigits(Math.round(totalCost).toLocaleString())}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">هزینه تعمیرات</div>
              <div className="font-bold num">{toPersianDigits(Math.round(totalMaintenanceCost).toLocaleString())}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.key
                  ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="card p-6">
          <h2 className="font-bold text-slate-800 mb-4">مشخصات فنی</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <InfoField label="کد" value={equipment.code} mono />
            <InfoField label="برند" value={equipment.brand} />
            <InfoField label="مدل" value={equipment.model} />
            <InfoField label="سال ساخت" value={equipment.year} mono />
            <InfoField label="پلاک" value={equipment.plateNumber} mono />
            <InfoField label="سریال" value={equipment.serialNumber} mono />
            <InfoField label="مالکیت" value={EQUIPMENT_OWNERSHIP_LABELS[equipment.ownership]} />
            <InfoField label="مالک" value={equipment.owner?.name} />
            <InfoField label="پروژه فعلی" value={equipment.currentProject?.name} />
            <InfoField
              label="نرخ ساعتی"
              value={equipment.hourlyRate ? Number(equipment.hourlyRate).toLocaleString() + ' ریال' : undefined}
              mono
            />
            <InfoField
              label="نرخ روزانه"
              value={equipment.dailyRate ? Number(equipment.dailyRate).toLocaleString() + ' ریال' : undefined}
              mono
            />
            <InfoField label="نوع سوخت" value={equipment.fuelType} />
            <InfoField
              label="مصرف استاندارد"
              value={equipment.fuelNormPerHour ? Number(equipment.fuelNormPerHour) + ' لیتر/ساعت' : undefined}
              mono
            />
          </div>
          {equipment.description && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-1">توضیحات</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{equipment.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" /> کارکرد روزانه
            </h2>
            <button
              className="btn-primary text-sm"
              onClick={() => navigate(`/equipment/logs/new?equipmentId=${equipment.id}`)}
            >
              <Plus className="w-4 h-4" /> ثبت کارکرد
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              هیچ کارکردی ثبت نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-3 py-2">تاریخ</th>
                    <th className="text-center px-3 py-2">پروژه</th>
                    <th className="text-center px-3 py-2">ساعت کار</th>
                    <th className="text-center px-3 py-2">درجا</th>
                    <th className="text-center px-3 py-2">توقف</th>
                    <th className="text-center px-3 py-2">خرابی</th>
                    <th className="text-center px-3 py-2">سوخت (ل)</th>
                    <th className="text-left px-3 py-2">هزینه</th>
                    <th className="text-center px-3 py-2">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 num text-xs">{formatJalaliDate(log.logDate)}</td>
                      <td className="px-3 py-2 text-center text-xs">{log.project?.name || '—'}</td>
                      <td className="px-3 py-2 text-center num">{toPersianDigits(Number(log.workHours))}</td>
                      <td className="px-3 py-2 text-center num">{toPersianDigits(Number(log.idleHours))}</td>
                      <td className="px-3 py-2 text-center num">{toPersianDigits(Number(log.stopHours))}</td>
                      <td className="px-3 py-2 text-center num">{toPersianDigits(Number(log.breakdownHours))}</td>
                      <td className="px-3 py-2 text-center num">{toPersianDigits(Number(log.fuelLiters))}</td>
                      <td className="px-3 py-2 text-left num text-xs">{toPersianDigits(Math.round(Number(log.computedCost)).toLocaleString())}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-md', EQUIPMENT_LOG_STATUS_COLORS[log.status])}>
                          {EQUIPMENT_LOG_STATUS_LABELS[log.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Maintenances */}
      {tab === 'maintenances' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-600" /> تعمیرات و نگهداری
            </h2>
            <button
              className="btn-primary text-sm"
              onClick={() => navigate(`/equipment/maintenances/new?equipmentId=${equipment.id}`)}
            >
              <Plus className="w-4 h-4" /> ثبت تعمیر
            </button>
          </div>
          {maintenances.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              هیچ تعمیری ثبت نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-right px-3 py-2">تاریخ</th>
                    <th className="text-center px-3 py-2">نوع</th>
                    <th className="text-right px-3 py-2">شرح</th>
                    <th className="text-right px-3 py-2">تأمین‌کننده</th>
                    <th className="text-left px-3 py-2">هزینه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenances.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 num text-xs">{formatJalaliDate(m.maintenanceDate)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                          {MAINTENANCE_TYPE_LABELS[m.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{m.description}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{m.vendor || '—'}</td>
                      <td className="px-3 py-2 text-left num text-xs">{toPersianDigits(Number(m.cost).toLocaleString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={clsx('text-sm text-slate-800', mono && 'num')} dir={mono ? 'ltr' : undefined}>
        {value === null || value === undefined || value === '' ? (
          <span className="text-slate-300">—</span>
        ) : (
          toPersianDigits(String(value))
        )}
      </div>
    </div>
  );
}