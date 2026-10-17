import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Upload, Trash2, Loader2, Save } from 'lucide-react';
import { companyProfileApi, type CompanyProfile } from '../services/company-profile.api';
import { api } from '@/services/api';

export default function CompanySettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = async () => {
    try {
      const p = await companyProfileApi.get();
      setProfile(p);
      setName(p.name || '');
    } catch {
      toast.error('خطا در بارگذاری پروفایل شرکت');
    }
  };

  useEffect(() => { void load(); }, []);

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  };

  const onStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingStamp(true);
    try {
      const url = await uploadFile(f);
      const p = await companyProfileApi.update({ stampUrl: url });
      setProfile(p);
      toast.success('مهر شرکت ذخیره شد');
    } catch {
      toast.error('خطا در آپلود مهر');
    } finally {
      setUploadingStamp(false);
      e.target.value = '';
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(f);
      const p = await companyProfileApi.update({ logoUrl: url });
      setProfile(p);
      toast.success('لوگوی شرکت ذخیره شد');
    } catch {
      toast.error('خطا در آپلود لوگو');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const removeStamp = async () => {
    if (!confirm('مهر شرکت حذف شود؟')) return;
    try {
      const p = await companyProfileApi.update({ stampUrl: null });
      setProfile(p);
      toast.success('مهر حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const removeLogo = async () => {
    if (!confirm('لوگو حذف شود؟')) return;
    try {
      const p = await companyProfileApi.update({ logoUrl: null });
      setProfile(p);
      toast.success('لوگو حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const saveName = async () => {
    setSaving(true);
    try {
      const p = await companyProfileApi.update({ name });
      setProfile(p);
      toast.success('نام شرکت ذخیره شد');
    } catch {
      toast.error('خطا');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>;
  }

  return (
    <div dir="rtl" className="p-4 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="w-6 h-6" /> تنظیمات شرکت
      </h1>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-lg">نام شرکت</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="نام شرکت"
          />
          <button onClick={saveName} disabled={saving} className="btn-primary flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-lg">مهر شرکت</h2>
        <p className="text-sm text-slate-500">این مهر در پایین اسناد چاپی (صورت‌وضعیت، فاکتور و ...) درج می‌شود.</p>
        <div className="flex items-center gap-4">
          {profile.stampUrl ? (
            <img src={profile.stampUrl} alt="مهر شرکت" className="w-24 h-24 object-contain border rounded" />
          ) : (
            <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center text-slate-400 text-xs">بدون مهر</div>
          )}
          <div className="flex gap-2">
            <label className="btn-primary flex items-center gap-1 cursor-pointer">
              {uploadingStamp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              آپلود مهر
              <input type="file" accept="image/*" className="hidden" onChange={onStamp} disabled={uploadingStamp} />
            </label>
            {profile.stampUrl && (
              <button onClick={removeStamp} className="btn-secondary text-red-600 flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> حذف
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-lg">لوگوی شرکت</h2>
        <p className="text-sm text-slate-500">در سرصفحه چاپ استفاده می‌شود (در صورت نبود، لوگوی پیش‌فرض نمایش داده می‌شود).</p>
        <div className="flex items-center gap-4">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="لوگو" className="w-24 h-24 object-contain border rounded" />
          ) : (
            <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center text-slate-400 text-xs">بدون لوگو</div>
          )}
          <div className="flex gap-2">
            <label className="btn-primary flex items-center gap-1 cursor-pointer">
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              آپلود لوگو
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploadingLogo} />
            </label>
            {profile.logoUrl && (
              <button onClick={removeLogo} className="btn-secondary text-red-600 flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> حذف
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
