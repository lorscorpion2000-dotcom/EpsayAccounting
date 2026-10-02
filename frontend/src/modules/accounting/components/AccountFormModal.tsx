import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { accountingApi } from '../services/accounting.api';
import { api } from '@/services/api';
import type { Account } from '@/types/accounting';

interface Props {
  isOpen: boolean;
  editing: Account | null;
  allAccounts: Account[];
  defaultParentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AccountFormModal({ isOpen, editing, allAccounts, defaultParentId, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [detailOptions, setDetailOptions] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState<any>({
    code: '', name: '', level: 'GROUP', nature: 'DEBIT',
    parentId: '', isPostable: true, isActive: true, description: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        code: editing.code, name: editing.name,
        level: editing.level, nature: editing.nature,
        parentId: editing.parentId || '',
        isPostable: editing.isPostable, isActive: editing.isActive,
        description: editing.description || '',
        detailType: (editing as any).detailType || '',
        detailId: (editing as any).detailId || '',
      });
    } else {
      let autoLevel: 'GROUP' | 'GENERAL' | 'SUBSIDIARY' = 'GROUP';
      let autoNature = 'DEBIT';
      if (defaultParentId) {
        const parent = allAccounts.find((a) => a.id === defaultParentId);
        if (parent) {
          autoLevel = parent.level === 'GROUP' ? 'GENERAL' : 'SUBSIDIARY';
          autoNature = parent.nature;
        }
      }
      setForm({
        code: '', name: '', level: autoLevel, nature: autoNature,
        parentId: defaultParentId || '',
        isPostable: true, isActive: true, description: '',
        detailType: '',
        detailId: '',
      });
    }
  }, [isOpen, editing, defaultParentId]);

  useEffect(() => {
    if (form.detailType) loadDetailOptions(form.detailType);
    else setDetailOptions([]);
  }, [form.detailType]);



  if (!isOpen) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const levelOrder = ['GROUP', 'GENERAL', 'SUBSIDIARY'];
  const currentLevelIdx = levelOrder.indexOf(form.level);
  const potentialParents = allAccounts.filter((a) => {
    if (a.level === form.level) return false;
    const idx = levelOrder.indexOf(a.level);
    return idx === currentLevelIdx - 1;
  });

  const suggestCode = () => {
    if (!form.parentId) {
      if (form.level === 'GROUP') {
        const groups = allAccounts.filter((a) => a.level === 'GROUP');
        const maxNum = groups.reduce((m, a) => Math.max(m, parseInt(a.code) || 0), 0);
        return String(maxNum + 1);
      }
      return '';
    }
    const parent = allAccounts.find((a) => a.id === form.parentId);
    if (!parent) return '';
    const siblings = allAccounts.filter((a) => a.parentId === parent.id);
    const maxLast = siblings.reduce((m, a) => {
      const parts = a.code.split('.');
      return Math.max(m, parseInt(parts[parts.length - 1]) || 0);
    }, 0);
    return parent.code + '.' + (maxLast + 1);
  };

  const loadDetailOptions = async (dt: string) => {
    setLoadingDetail(true);
    try {
      let items: any[] = [];
      if (dt === 'PARTNER') {
        const r = await api.get('/partners').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: p.name + (p.code ? ' (' + p.code + ')' : '') }));
      } else if (dt === 'ITEM') {
        const r = await api.get('/warehouse/items').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: p.name + (p.code ? ' (' + p.code + ')' : '') }));
      } else if (dt === 'PETTY_CASH') {
        const r = await api.get('/petty-cash/accounts').catch(() => ({ data: [] }));
        items = (r.data || []).map((p: any) => ({ id: p.id, label: (p.name || '') + ' - ' + (p.holder?.fullName || p.employee?.fullName || '') }));
      }
      setDetailOptions(items);
    } finally { setLoadingDetail(false); }
  };
  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('نام حساب الزامی است'); return; }
    if (!form.code.trim()) { toast.error('کد حساب الزامی است'); return; }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code, name: form.name,
        level: form.level, nature: form.nature,
        isPostable: form.isPostable, isActive: form.isActive,
      };
      if (form.parentId) payload.parentId = form.parentId;
      if (form.level === 'TAFZIL') {
        if (form.detailType) payload.detailType = form.detailType;
        if (form.detailId) payload.detailId = form.detailId;
      }
      if (form.description) payload.description = form.description;

      if (editing) await (accountingApi.accounts as any).update(editing.id, payload);
      else await accountingApi.accounts.create(payload);
      toast.success(editing ? 'ویرایش شد' : 'حساب ایجاد شد');
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            {editing ? 'ویرایش حساب' : 'حساب جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">سطح حساب *</label>
              <select value={form.level}
                onChange={(e) => { set('level', e.target.value); set('parentId', ''); }}
                disabled={!!editing} className="input w-full">
                <option value="GROUP">گروه</option>
                <option value="GENERAL">کل</option>
                <option value="SUBSIDIARY">معین</option>
                <option value="TAFZIL">تفصیلی</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ماهیت *</label>
              <select value={form.nature} onChange={(e) => set('nature', e.target.value)} className="input w-full">
                <option value="DEBIT">بدهکار</option>
                <option value="CREDIT">بستانکار</option>
              </select>
            </div>

            {form.level === 'TAFZIL' && (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 mb-3">
                <b>تفصیلی</b> برای اتصال به یک entity خاص (شخص کالا تنخواه‌گردان) استفاده می‌شود.
              </div>
            )}

            {form.level === 'TAFZIL' && (
              <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 mb-3">
                <b>تفصیلی</b> برای اتصال به یک entity خاص (شخص کالا تنخواه‌گردان) استفاده می‌شود.
              </div>
            )}

            {form.level !== 'GROUP' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  حساب والد {form.level === 'GENERAL' ? '(گروه)' : '(کل)'}
                </label>
                <select value={form.parentId} onChange={(e) => set('parentId', e.target.value)} className="input w-full">
                  <option value="">— انتخاب کنید —</option>
                  {potentialParents.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">کد حساب *</label>
              <div className="flex gap-2">
                <input value={form.code} onChange={(e) => set('code', e.target.value)}
                  className="input flex-1 num" dir="ltr" placeholder="1.1.1" />
                <button type="button" onClick={() => set('code', suggestCode())}
                  className="btn-secondary text-xs">خودکار</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام حساب *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input w-full" />
            </div>

            <div className="md:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPostable}
                  onChange={(e) => set('isPostable', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">قابل استفاده در سند</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">فعال</span>
              </label>
            </div>

            {form.level === 'TAFZIL' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع تفصیلی *</label>
                  <select
                    value={form.detailType}
                    onChange={(e) => { set('detailType', e.target.value); set('detailId', ''); }}
                    className="input w-full"
                  >
                    <option value="">— انتخاب کنید —</option>
                    <option value="PARTNER">شخص (مشتری/تأمین‌کننده/پرسنل)</option>
                    <option value="ITEM">کالا</option>
                    <option value="PETTY_CASH">تنخواه‌گردان</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب {form.detailType === 'PARTNER' ? 'شخص' : form.detailType === 'ITEM' ? 'کالا' : form.detailType === 'PETTY_CASH' ? 'تنخواه‌گردان' : 'مورد'} *</label>
                  <select
                    value={form.detailId}
                    onChange={(e) => set('detailId', e.target.value)}
                    className="input w-full"
                    disabled={!form.detailType || loadingDetail}
                  >
                    <option value="">{loadingDetail ? 'در حال بارگذاری...' : '— انتخاب کنید —'}</option>
                    {detailOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {form.level === 'TAFZIL' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع تفصیلی *</label>
                  <select
                    value={form.detailType}
                    onChange={(e) => { set('detailType', e.target.value); set('detailId', ''); }}
                    className="input w-full"
                  >
                    <option value="">— انتخاب کنید —</option>
                    <option value="PARTNER">شخص (مشتری/تأمین‌کننده/پرسنل)</option>
                    <option value="ITEM">کالا</option>
                    <option value="PETTY_CASH">تنخواه‌گردان</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب {form.detailType === 'PARTNER' ? 'شخص' : form.detailType === 'ITEM' ? 'کالا' : form.detailType === 'PETTY_CASH' ? 'تنخواه‌گردان' : 'مورد'} *</label>
                  <select
                    value={form.detailId}
                    onChange={(e) => set('detailId', e.target.value)}
                    className="input w-full"
                    disabled={!form.detailType || loadingDetail}
                  >
                    <option value="">{loadingDetail ? 'در حال بارگذاری...' : '— انتخاب کنید —'}</option>
                    {detailOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={2} className="input w-full resize-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t bg-slate-50">
          <button onClick={onClose} className="btn-secondary">انصراف</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'ذخیره' : 'ثبت'}
          </button>
        </div>
      </div>
    </div>
  );
}