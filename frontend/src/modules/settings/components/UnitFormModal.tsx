import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Save, Ruler } from 'lucide-react';
import { unitsApi, Unit } from '../services/units.api';

interface Props {
  isOpen: boolean;
  editing: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function UnitFormModal({ isOpen, editing, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [sortOrder, setSortOrder] = useState('100');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setCode(editing.code);
      setName(editing.name);
      setSymbol(editing.symbol || '');
      setSortOrder(String(editing.sortOrder ?? 100));
      setIsActive(editing.isActive);
    } else {
      setCode('');
      setName('');
      setSymbol('');
      setSortOrder('100');
      setIsActive(true);
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !code.trim()) { toast.error('کد الزامی است'); return; }
    if (!name.trim()) { toast.error('نام الزامی است'); return; }
    setBusy(true);
    try {
      if (editing) {
        await unitsApi.update(editing.id, {
          name: name.trim(),
          symbol: symbol.trim() || undefined,
          sortOrder: Number(sortOrder) || 100,
          isActive,
        });
        toast.success('ذخیره شد');
      } else {
        await unitsApi.create({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim() || undefined,
          sortOrder: Number(sortOrder) || 100,
          isActive,
        });
        toast.success('واحد ساخته شد');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-brand-600" />
            {editing ? 'ویرایش واحد' : 'واحد جدید'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-200">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">کد *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              disabled={!!editing}
              dir="ltr"
              maxLength={32}
              className="input num font-mono disabled:bg-slate-50"
              placeholder="مثلا: BOX"
            />
            <p className="text-xs text-slate-500 mt-1">
              فقط حروف انگلیسی عدد و _ — پس از ذخیره قابل تغییر نیست
            </p>
          </div>

          <div>
            <label className="label">نام فارسی *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              className="input"
              placeholder="مثلا: جعبه"
            />
          </div>

          <div>
            <label className="label">نماد (اختیاری)</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={16}
              dir="ltr"
              className="input num font-mono"
              placeholder="مثلا: box"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ترتیب نمایش</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input num"
              />
            </div>
            <div>
              <label className="label">وضعیت</label>
              <select
                value={isActive ? '1' : '0'}
                onChange={(e) => setIsActive(e.target.value === '1')}
                className="input"
              >
                <option value="1">فعال</option>
                <option value="0">غیرفعال</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">انصراف</button>
            <button type="submit" disabled={busy} className="btn-primary">
              <Save className="w-4 h-4" />
              {busy ? 'در حال ذخیره...' : (editing ? 'ذخیره' : 'ساخت')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
