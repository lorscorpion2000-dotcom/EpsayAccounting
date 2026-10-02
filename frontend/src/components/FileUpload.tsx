import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Upload, X, Loader2, File as FileIcon, ExternalLink, Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/services/api';

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
}

export default function FileUpload({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx',
  maxSizeMb = 10,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`حجم فایل باید کمتر از ${maxSizeMb} مگابایت باشد`);
      return;
    }
    setUploading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ url: string; filename: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
      toast.success('فایل آپلود شد');
    } catch (err: any) {
      const m = err?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'خطا در آپلود');
      setFileName('');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [maxSizeMb, onChange]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange(null);
    setFileName('');
  };

  const displayName = fileName || (value ? value.split('/').pop() || '' : '');

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {value ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-3">
            {isImage(value) ? (
              <img
                src={value}
                alt="پیش‌نمایش"
                className="w-16 h-16 object-cover rounded border border-emerald-300 shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-white rounded border border-emerald-300 shrink-0">
                <FileIcon className="w-7 h-7 text-emerald-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-emerald-900 truncate" title={displayName}>
                {displayName}
              </div>
              <div className="text-xs text-emerald-600 mt-0.5">فایل آپلود شده</div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
                title="مشاهده"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                title="حذف"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={
            'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ' +
            (dragOver
              ? 'border-brand-500 bg-brand-50 scale-[1.02]'
              : 'border-slate-300 hover:border-brand-500 hover:bg-brand-50/30')
          }
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <span className="text-sm text-brand-600">در حال آپلود...</span>
            </>
          ) : dragOver ? (
            <>
              <Upload className="w-6 h-6 text-brand-600" />
              <span className="text-sm font-medium text-brand-600">
                فایل را رها کنید
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  برای انتخاب فایل کلیک کنید یا اینجا رها کنید
                </span>
              </div>
              <span className="text-xs text-slate-400">
                (حداکثر {maxSizeMb}MB · PDF, تصویر, Word, Excel)
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}