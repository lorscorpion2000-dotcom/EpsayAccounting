import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2, Info } from 'lucide-react';
import { accountingApi } from '../services/accounting.api';
import { api } from '@/services/api';
import type { Account, AccountDetailType, AccountLevel } from '@/types/accounting';
import { ACCOUNT_DETAIL_TYPE_LABELS } from '@/types/accounting';

interface Props {
  isOpen: boolean;
  editing: Account | null;
  allAccounts: Account[];
  defaultParentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const LEVEL_ORDER: AccountLevel[] = ['GROUP', 'GENERAL', 'SUBSIDIARY', 'DETAIL'];
const LEVEL_LABELS: Record<AccountLevel, string> = {
  GROUP: 'گروه', GENERAL: 'کل', SUBSIDIARY: 'معین', DETAIL: 'تفضیلی',
};

const REQUIRES_ENTITY: AccountDetailType[] = [
  'PARTNER', 'ITEM', 'PETTY_CASH', 'PROJECT',
  'EMPLOYEE', 'CONTRACTOR', 'CUSTOMER', 'SUPPLIER',
];

export default function AccountFormModal({
  isOpen, editing, allAccounts, defaultParentId, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [detailOptions, setDetailOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState<any>({
    code: '', name: '', level: 'GROUP' as AccountLevel, nature: 'DEBIT',
    parentId: '', isPostable: false, isActive: true, description: '',
    detailType: '' as AccountDetailType | '',
    detailId: '',
  });

  // â”€â”€ ALL hooks must be declared BEFORE any conditional return â”€â”€

  const flatAccounts = useMemo(() => {
    const out: Account[] = [];
    const rec = (arr: Account[]) => {
      arr.forEach((a) => {
        out.push(a);
        if (a.children && a.children.length) rec(a.children);
      });
    };
    rec(allAccounts);
    return out;
  }, [allAccounts]);

  const potentialParents = useMemo(() => {
    const idx = LEVEL_ORDER.indexOf(form.level);
    if (idx <= 0) return [];
    const wanted = LEVEL_ORDER[idx - 1];
    return flatAccounts.filter((a) => a.level === wanted);
  }, [flatAccounts, form.level]);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        level: editing.level,
        nature: editing.nature,
        parentId: editing.parentId || '',
        isPostable: editing.isPostable,
        isActive: editing.isActive,
        description: editing.description || '',
        detailType: editing.detailType || '',
        detailId: editing.detailId || '',
      });
    } else {
      let autoLevel: AccountLevel = 'GROUP';
      let autoNature: 'DEBIT' | 'CREDIT' = 'DEBIT';
      if (defaultParentId) {
        const parent = flatAccounts.find((a) => a.id === defaultParentId);
        if (parent) {
          const pIdx = LEVEL_ORDER.indexOf(parent.level);
          autoLevel = LEVEL_ORDER[Math.min(pIdx + 1, LEVEL_ORDER.length - 1)];
          autoNature = parent.nature;
        }
      }
      setForm({
        code: '', name: '', level: autoLevel, nature: autoNature,
        parentId: defaultParentId || '',
        isPostable: autoLevel === 'SUBSIDIARY' || autoLevel === 'DETAIL',
        isActive: true, description: '',
        detailType: '', detailId: '',
      });
    }
  }, [isOpen, editing, defaultParentId, flatAccounts]);

  useEffect(() => {
    if (!form.detailType) { setDetailOptions([]); return; }
    loadDetailOptions(form.detailType);
    // eslint-disable-next-line
  }, [form.detailType]);

  // â”€â”€ NOW early return is safe â”€â”€
  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleParentChange = (parentId: string) => {
    if (!parentId) { set('parentId', ''); return; }
    const parent = flatAccounts.find((a) => a.id === parentId);
    if (!parent) { set('parentId', parentId); return; }
    const pIdx = LEVEL_ORDER.indexOf(parent.level);
    const newLevel = LEVEL_ORDER[Math.min(pIdx + 1, LEVEL_ORDER.length - 1)];
    setForm((f: any) => ({
      ...f,
      parentId,
      level: newLevel,
      nature: parent.nature,
      isPostable: newLevel === 'SUBSIDIARY' || newLevel === 'DETAIL',
    }));
  };

  const suggestCode = (): string => {
    if (form.level === 'GROUP') {
      const groups = flatAccounts.filter((a) => a.level === 'GROUP');
      const max = groups.reduce((m, a) => Math.max(m, parseInt(a.code) || 0), 0);
      return String(max + 1);
    }
    if (!form.parentId) return '';
    const parent = flatAccounts.find((a) => a.id === form.parentId);
    if (!parent) return '';
    const siblings = flatAccounts.filter((a) => a.parentId === parent.id);
    const maxLast = siblings.reduce((m, a) => {
      const parts = a.code.split('.');
      return Math.max(m, parseInt(parts[parts.length - 1]) || 0);
    }, 0);
    const next = maxLast + 1;
    const pad = form.level === 'DETAIL' ? 2 : 0;
    const suffix = pad ? String(next).padStart(pad, '0') : String(next);
    return parent.code + '.' + suffix;
  };

  const loadDetailOptions = async (dt: AccountDetailType) => {
    setLoadingDetail(true);
    setDetailOptions([]);
    try {
      const wrap = (arr: any[], labeler: (x: any) => string) =>
        (arr || []).map((x) => ({ id: x.id, label: labeler(x) }));
      let items: { id: string; label: string }[] = [];

      if (dt === 'PARTNER' || dt === 'SUPPLIER' || dt === 'CONTRACTOR') {
        const r = await api.get('/partners').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => p.name + (p.code ? ' (' + p.code + ')' : ''));
      } else if (dt === 'ITEM') {
        const r = await api.get('/warehouse/items').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => p.name + (p.code ? ' (' + p.code + ')' : ''));
      } else if (dt === 'PETTY_CASH') {
        const r = await api.get('/petty-cash/accounts').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => (p.name || '') + (p.holder?.fullName ? ' - ' + p.holder.fullName : ''));
      } else if (dt === 'PROJECT') {
        const r = await api.get('/projects').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => p.name + (p.code ? ' (' + p.code + ')' : ''));
      } else if (dt === 'EMPLOYEE') {
        const r = await api.get('/payroll/employees').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => (p.fullName || p.name || '') + (p.personnelCode ? ' (' + p.personnelCode + ')' : ''));
      } else if (dt === 'CUSTOMER') {
        const r = await api.get('/sales/customers').catch(() => ({ data: [] }));
        items = wrap(r.data, (p) => p.fullName || p.name || '');
      }
      setDetailOptions(items);
    } finally {
      setLoadingDetail(false);
    }
  };

  const requiresEntity = !!(form.detailType && REQUIRES_ENTITY.includes(form.detailType as AccountDetailType));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('نام حساب الزامی است'); return; }
    if (!form.code.trim()) { toast.error('کد حساب الزامی است'); return; }
    if (form.level !== 'GROUP' && !form.parentId) {
      toast.error('انتخاب حساب والد الزامی است'); return;
    }
    if (form.level === 'DETAIL' && requiresEntity && !form.detailId) {
      toast.error('انتخاب تفضیل الزامی است'); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim(),
        name: form.name.trim(),
        level: form.level,
        nature: form.nature,
        isPostable: form.isPostable,
        isActive: form.isActive,
      };
      if (form.parentId) payload.parentId = form.parentId;
      if (form.level === 'DETAIL') {
        if (form.detailType) payload.detailType = form.detailType;
        if (form.detailId) payload.detailId = form.detailId;
      }
      if (form.description && form.description.trim()) payload.description = form.description.trim();

      if (editing) {
        await accountingApi.accounts.update(editing.id, payload);
        toast.success('حساب ویرایش شد');
      } else {
        await accountingApi.accounts.create(payload);
        toast.success('حساب ایجاد شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در ذخیره‌سازی');
    } finally {
      setSaving(false);
    }
  };

  const isGroup = form.level === 'GROUP';
  const parentLabel = LEVEL_LABELS[LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(form.level) - 1)]];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">{editing ? 'ویرایش حساب' : 'حساب جدید'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">سطح حساب *</label>
              <select
                value={form.level}
                onChange={(e) => {
                  const v = e.target.value as AccountLevel;
                  setForm((f: any) => ({
                    ...f, level: v, parentId: '',
                    isPostable: v === 'SUBSIDIARY' || v === 'DETAIL',
                  }));
                }}
                disabled={!!editing}
                className="input w-full"
              >
                {LEVEL_ORDER.map((lv) => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ماهیت *</label>
              <select value={form.nature} onChange={(e) => set('nature', e.target.value)} className="input w-full">
                <option value="DEBIT">بدهکار</option>
                <option value="CREDIT">بستانکار</option>
              </select>
            </div>

            {!isGroup && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  حساب والد ({parentLabel}) *
                </label>
                <select value={form.parentId} onChange={(e) => handleParentChange(e.target.value)} className="input w-full">
                  <option value="">- انتخاب کنید -</option>
                  {potentialParents.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
                {potentialParents.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    هیچ حساب سطح Â«{parentLabel}Â» وجود ندارد. اول آن را ایجاد کنید.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد حساب *</label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  className="input flex-1 num"
                  dir="ltr"
                  placeholder={form.level === 'DETAIL' ? '1.1.1.01' : '1.1.1'}
                />
                <button type="button" onClick={() => set('code', suggestCode())} className="btn-secondary text-xs whitespace-nowrap">
                  خودکار
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام حساب *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input w-full" />
            </div>

            {form.level === 'DETAIL' && (
              <>
                <div className="md:col-span-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div><b>تفضیلی</b> برای اتصال به یک entity خاص (شخص / بانک / تنخواه / پروژه / ...) استفاده می‌شود.</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع تفضیلی *</label>
                  <select
                    value={form.detailType}
                    onChange={(e) => { set('detailType', e.target.value); set('detailId', ''); }}
                    className="input w-full"
                  >
                    <option value="">- انتخاب کنید -</option>
                    {(Object.keys(ACCOUNT_DETAIL_TYPE_LABELS) as AccountDetailType[]).map((dt) => (
                      <option key={dt} value={dt}>{ACCOUNT_DETAIL_TYPE_LABELS[dt]}</option>
                    ))}
                  </select>
                </div>

                {requiresEntity && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      انتخاب {ACCOUNT_DETAIL_TYPE_LABELS[form.detailType as AccountDetailType]} *
                    </label>
                    <select
                      value={form.detailId}
                      onChange={(e) => set('detailId', e.target.value)}
                      className="input w-full"
                      disabled={!form.detailType || loadingDetail}
                    >
                      <option value="">{loadingDetail ? 'در حال بارگذاری...' : '- انتخاب کنید -'}</option>
                      {detailOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    {!loadingDetail && form.detailType && detailOptions.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">آیتمی برای این نوع ثبت نشده است.</p>
                    )}
                  </div>
                )}

                {!requiresEntity && form.detailType && (
                  <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                    برای نوع Â«{ACCOUNT_DETAIL_TYPE_LABELS[form.detailType as AccountDetailType]}Â» نیازی به انتخاب entity نیست؛ نام دلخواه را در فیلد «نام حساب» وارد کنید.
                  </div>
                )}
              </>
            )}

            <div className="md:col-span-2 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPostable} onChange={(e) => set('isPostable', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">قابل استفاده در سند</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">فعال</span>
              </label>
              {(form.level === 'GROUP' || form.level === 'GENERAL') && form.isPostable && (
                <span className="text-xs text-amber-600">معمولاً گروه و کل قابل استفاده در سند نیستند</span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className="input w-full resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="mr-2">{editing ? 'ذخیره' : 'ایجاد'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}