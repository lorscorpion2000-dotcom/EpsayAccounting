import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, X, Loader2, FileSpreadsheet, Plus, Trash2, Calculator, Package, Users, Wrench, Truck, Cog } from 'lucide-react';
import clsx from 'clsx';
import { clientStatementApi } from '../services/client-statement.api';
import { api } from '@/services/api';
import { PersianDatePicker } from '@/components/PersianDatePicker';
import type {
  CSCategory, ClientStatement, CSItem, CreateCSPayload,
} from '@/types/client-statement';
import { CS_CATEGORY_LABELS, CS_CATEGORY_ORDER } from '@/types/client-statement';
import { toPersianDigits } from '@/utils/format';

type Tab = 'general' | CSCategory;

interface LocalItem {
  _key: string;
  id?: string;
  category: CSCategory;
  priceListCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  itemDate: string;
  notes: string;
}

const CATEGORY_ICONS: Record<CSCategory, any> = {
  MATERIAL: Package,
  LABOR: Users,
  MISC: Wrench,
  TRANSPORT: Truck,
  EQUIPMENT: Cog,
};

function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

let keyCounter = 0;
function newItem(category: CSCategory): LocalItem {
  return {
    _key: 'k' + (++keyCounter),
    category,
    priceListCode: '',
    description: '',
    unit: '',
    unitPrice: 0,
    quantity: 1,
    itemDate: todayISO(),
    notes: '',
  };
}

export default function ClientStatementFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [tab, setTab] = useState<Tab>('general');
  const [unitsList, setUnitsList] = useState<{ id: string; code: string; name: string; symbol?: string | null }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [, setPriceLists] = useState<any[]>([]);
  useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // General fields
  const [projectId, setProjectId] = useState('');
  const [contractId, setContractId] = useState('');
  const [statementNumber, setStatementNumber] = useState<number>(0);
  const [periodStart, setPeriodStart] = useState(todayISO());
  const [periodEnd, setPeriodEnd] = useState(todayISO());
  const [coefficient, setCoefficient] = useState(1.07);
  const [contractorSharePercent, setContractorSharePercent] = useState(7);
  const [prepaymentDeductionPercent, setPrepaymentDeductionPercent] = useState(20);
  const [description, setDescription] = useState('');

  // Items per category
  const [items, setItems] = useState<LocalItem[]>([]);

  // Load data on mount
  useEffect(() => {
    Promise.all([
      api.get('/projects').then((r) => r.data).catch(() => []),
      api.get('/project-contracts').then((r) => r.data).catch(() => []),
      api.get('/price-lists', { params: { status: 'PUBLISHED' } }).then((r) => r.data).catch(() => []),
    ]).then(([prj, ctr, pls]) => {
      setProjects(prj);
      setContracts(ctr);
      setPriceLists(pls);
    });

    if (isEdit && id) {
      clientStatementApi.get(id).then((s: ClientStatement) => {
        setProjectId(s.projectId);
        setContractId(s.contractId || '');
        setStatementNumber(s.statementNumber);
        setPeriodStart(s.periodStart?.slice(0, 10) || todayISO());
        setPeriodEnd(s.periodEnd?.slice(0, 10) || todayISO());
        setCoefficient(Number(s.coefficient));
        setContractorSharePercent(Number(s.contractorSharePercent));
        setPrepaymentDeductionPercent(Number(s.prepaymentDeductionPercent));
        setDescription(s.description || '');
        setItems((s.items || []).map((it: CSItem) => ({
          _key: 'k' + (++keyCounter),
          id: it.id,
          category: it.category,
          priceListCode: it.priceListCode || '',
          description: it.description,
          unit: it.unit || '',
          unitPrice: Number(it.unitPrice),
          quantity: Number(it.quantity),
          itemDate: it.itemDate?.slice(0, 10) || '',
          notes: it.notes || '',
        })));
      }).catch(() => toast.error('خطا در بارگذاری'))
        .finally(() => setLoadingData(false));
    } else {
      setLoadingData(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/units');
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setUnitsList(arr.filter((u: any) => u.isActive !== false));
      } catch { /* silent */ }
    })();
  }, []);

  // Auto-fetch next statement number when project selected
  useEffect(() => {
    if (isEdit || !projectId) return;
    clientStatementApi.nextNumber(projectId)
      .then((n) => setStatementNumber(n))
      .catch(() => setStatementNumber(1));
  }, [projectId, isEdit]);

  // Auto-detect contract coefficient when contract selected
  useEffect(() => {
    if (!contractId) return;
    const c = contracts.find((x) => x.id === contractId);
    if (c) {
      setCoefficient(Number(c.coefficient || 1.07));
    }
  }, [contractId, contracts]);

  // Filter contracts by project
  const projectContracts = useMemo(() => {
    if (!projectId) return contracts;
    return contracts.filter((c) => c.projectId === projectId);
  }, [contracts, projectId]);

  // Compute totals for preview
  const totals = useMemo(() => {
    const sub: Record<CSCategory, number> = {
      MATERIAL: 0, LABOR: 0, MISC: 0, TRANSPORT: 0, EQUIPMENT: 0,
    };
    for (const it of items) {
      sub[it.category] += Number(it.unitPrice) * Number(it.quantity);
    }
    const before = Object.values(sub).reduce((a, b) => a + b, 0);
    const after = before * coefficient;
    const share = after - before;
    return { sub, before, after, share };
  }, [items, coefficient]);

  const addItem = (cat: CSCategory) => {
    setItems((prev) => [...prev, newItem(cat)]);
  };

  const updateItem = (_key: string, patch: Partial<LocalItem>) => {
    setItems((prev) => prev.map((it) => it._key === _key ? { ...it, ...patch } : it));
  };

  const removeItem = (_key: string) => {
    setItems((prev) => prev.filter((it) => it._key !== _key));
  };

  const itemsOfCategory = (cat: CSCategory) => items.filter((i) => i.category === cat);

  const onSubmit = async () => {
    if (!projectId || !periodStart || !periodEnd) {
      toast.error('پروژه و بازه تاریخ الزامی است');
      return;
    }
    if (items.length === 0) {
      toast.error('حداقل یک ردیف وارد کنید');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateCSPayload = {
        projectId,
        contractId: contractId || undefined,
        statementNumber: statementNumber || undefined,
        periodStart,
        periodEnd,
        coefficient,
        contractorSharePercent,
        prepaymentDeductionPercent,
        description: description || undefined,
        items: items.map((it) => ({
          category: it.category,
          priceListCode: it.priceListCode || undefined,
          description: it.description,
          unit: it.unit || undefined,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          itemDate: it.itemDate || undefined,
          notes: it.notes || undefined,
        })),
      };

      let savedId = id;
      if (isEdit && id) {
        await clientStatementApi.update(id, payload);
        toast.success('ویرایش شد');
      } else {
        const created = await clientStatementApi.create(payload);
        savedId = created.id;
        toast.success('صورت‌وضعیت ثبت شد');
      }
      navigate('/client-statements/' + savedId);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'خطا');
    } finally { setSaving(false); }
  };

  if (loadingData) {
    return <div className="card p-12 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const TABS = [
    { key: 'general' as Tab, label: 'اطلاعات اصلی', icon: Calculator },
    ...CS_CATEGORY_ORDER.map((cat) => ({
      key: cat as Tab,
      label: CS_CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat],
      count: itemsOfCategory(cat).length,
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-brand-600" />
          {isEdit ? 'ویرایش صورت‌وضعیت' : 'صورت‌وضعیت جدید'}
        </h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/client-statements')} className="btn-ghost">
            <X className="w-4 h-4" /> انصراف
          </button>
          <button type="button" onClick={onSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {'count' in t && t.count !== undefined && t.count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                    {toPersianDigits(t.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* General tab */}
      {tab === 'general' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-800 border-b pb-2">اطلاعات اصلی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">پروژه *</label>
              <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setContractId(''); }} className="input" disabled={isEdit}>
                <option value="">— انتخاب کنید —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">قرارداد (اختیاری)</label>
              <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="input">
                <option value="">— انتخاب کنید —</option>
                {projectContracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.description || ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">شماره صورت‌وضعیت</label>
              <input type="number" value={statementNumber || ''} onChange={(e) => setStatementNumber(Number(e.target.value))} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">ضریب پیمان</label>
              <input type="number" step="0.0001" value={coefficient} onChange={(e) => setCoefficient(Number(e.target.value))} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">تاریخ شروع دوره *</label>
              <PersianDatePicker value={periodStart} onChange={setPeriodStart} />
            </div>
            <div>
              <label className="label">تاریخ پایان دوره *</label>
              <PersianDatePicker value={periodEnd} onChange={setPeriodEnd} />
            </div>
            <div>
              <label className="label">حق‌العمل پیمانکار (٪)</label>
              <input type="number" step="0.01" value={contractorSharePercent} onChange={(e) => setContractorSharePercent(Number(e.target.value))} className="input num" dir="ltr" />
            </div>
            <div>
              <label className="label">درصد استهلاک پیش‌پرداخت (٪)</label>
              <input type="number" step="0.01" value={prepaymentDeductionPercent} onChange={(e) => setPrepaymentDeductionPercent(Number(e.target.value))} className="input num" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="label">توضیحات</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
            </div>
          </div>

          {/* Quick summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            {CS_CATEGORY_ORDER.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{CS_CATEGORY_LABELS[cat]}</div>
                    <div className="text-sm font-bold num">
                      {toPersianDigits(Math.round(totals.sub[cat]).toLocaleString())}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 rounded-lg bg-slate-50 border">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">جمع هزینه‌ها (قبل از ضریب)</div>
                <div className="font-bold num text-base">{toPersianDigits(Math.round(totals.before).toLocaleString())}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">پس از ضریب {coefficient}</div>
                <div className="font-bold num text-base">{toPersianDigits(Math.round(totals.after).toLocaleString())}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">حق‌العمل پیمانکار</div>
                <div className="font-bold num text-base text-brand-700">{toPersianDigits(Math.round(totals.share).toLocaleString())}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      {tab !== 'general' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="font-bold text-slate-700 flex items-center gap-2">
              {(() => { const I = CATEGORY_ICONS[tab]; return <I className="w-5 h-5 text-brand-600" />; })()}
              {CS_CATEGORY_LABELS[tab as CSCategory]}
              <span className="text-slate-400 text-sm font-normal">
                ({toPersianDigits(itemsOfCategory(tab as CSCategory).length)} ردیف)
              </span>
            </div>
            <button type="button" onClick={() => addItem(tab as CSCategory)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> افزودن ردیف
            </button>
          </div>

          {itemsOfCategory(tab as CSCategory).length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              هیچ ردیفی در این دسته وارد نشده است
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-center px-2 py-2 w-10 font-medium text-slate-600">#</th>
                    <th className="text-right px-2 py-2 w-28 font-medium text-slate-600">ش.ف</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600">شرح</th>
                    <th className="text-center px-2 py-2 w-24 font-medium text-slate-600">واحد</th>
                    <th className="text-left px-2 py-2 w-32 font-medium text-slate-600">بهای واحد</th>
                    <th className="text-center px-2 py-2 w-20 font-medium text-slate-600">مقدار</th>
                    <th className="text-left px-2 py-2 w-32 font-medium text-slate-600">جمع</th>
                    <th className="text-center px-2 py-2 w-32 font-medium text-slate-600">تاریخ</th>
                    <th className="text-center px-2 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsOfCategory(tab as CSCategory).map((it, idx) => (
                    <tr key={it._key}>
                      <td className="px-2 py-2 text-center text-slate-400 num text-xs">{toPersianDigits(idx + 1)}</td>
                      <td className="px-2 py-2">
                        <input type="text" value={it.priceListCode}
                          onChange={(e) => updateItem(it._key, { priceListCode: e.target.value })}
                          className="input num text-xs py-1.5" dir="ltr" placeholder="321" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={it.description}
                          onChange={(e) => updateItem(it._key, { description: e.target.value })}
                          className="input text-xs py-1.5" placeholder="شرح..." />
                      </td>
                      <td className="px-2 py-2">
                        <select
                            value={it.unit || ''}
                            onChange={(e) => updateItem(it._key, { unit: e.target.value })}
                            className="input text-xs py-1.5 text-center">
                            <option value="">—</option>
                            {unitsList.map(u => (
                              <option key={u.id} value={u.symbol || u.name}>
                                {u.name} ({u.symbol || u.code})
                              </option>
                            ))}
                            {it.unit && unitsList.length > 0 && !unitsList.some(u => (u.symbol || u.name) === it.unit) && (
                              <option value={it.unit}>{it.unit} (قبلی)</option>
                            )}
                          </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" value={it.unitPrice || ''}
                          onChange={(e) => updateItem(it._key, { unitPrice: Number(e.target.value) })}
                          className="input num text-xs py-1.5 text-left" dir="ltr" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" value={it.quantity || ''}
                          onChange={(e) => updateItem(it._key, { quantity: Number(e.target.value) })}
                          className="input num text-xs py-1.5 text-center" dir="ltr" />
                      </td>
                      <td className="px-2 py-2 text-left num text-xs font-bold">
                        {toPersianDigits(Math.round(Number(it.unitPrice) * Number(it.quantity)).toLocaleString())}
                      </td>
                      <td className="px-2 py-2">
                        <PersianDatePicker value={it.itemDate}
                          onChange={(v) => updateItem(it._key, { itemDate: v || '' })} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => removeItem(it._key)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2">
                  <tr>
                    <td colSpan={6} className="px-3 py-2 text-right font-bold text-slate-700 text-xs">
                      جمع {CS_CATEGORY_LABELS[tab as CSCategory]}:
                    </td>
                    <td className="px-2 py-2 text-left num font-bold text-sm">
                      {toPersianDigits(Math.round(totals.sub[tab as CSCategory]).toLocaleString())}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sticky summary bar */}
      <div className="sticky bottom-4">
        <div className="bg-white rounded-xl shadow-lg border p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            {CS_CATEGORY_ORDER.map((cat) => (
              <div key={cat}>
                <div className="text-[10px] text-slate-500">{CS_CATEGORY_LABELS[cat]}</div>
                <div className="text-xs font-bold num">
                  {toPersianDigits(Math.round(totals.sub[cat]).toLocaleString())}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between flex-wrap gap-3 text-sm">
            <div>
              <span className="text-slate-500">جمع کل: </span>
              <span className="num font-bold">{toPersianDigits(Math.round(totals.before).toLocaleString())}</span>
            </div>
            <div>
              <span className="text-slate-500">پس از ضریب {coefficient}: </span>
              <span className="num font-bold text-brand-700">{toPersianDigits(Math.round(totals.after).toLocaleString())}</span>
            </div>
            <div>
              <span className="text-slate-500">حق‌العمل: </span>
              <span className="num font-bold text-emerald-700">{toPersianDigits(Math.round(totals.share).toLocaleString())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
