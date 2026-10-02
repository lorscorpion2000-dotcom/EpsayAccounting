import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, X, Loader2, File as FileIcon, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
}

interface Props {
  values: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxSizeMb?: number;
  maxFiles?: number;
  label?: string;
}

export default function FileUploadMulti({
  values = [],
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx',
  maxSizeMb = 10,
  maxFiles = 10,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = async (files: File[]) => {
    if (values.length + files.length > maxFiles) {
      toast.error(`حداکثر ${maxFiles} فایل مجاز است`);
      return;
    }
    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of files) {
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`${file.name} بزرگ‌تر از ${maxSizeMb}MB است`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await api.post<UploadedFile>('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push(data);
      } catch (err: any) {
        toast.error(`خطا در ${file.name}`);
      }
    }
    setUploading(false);
    if (uploaded.length) {
      onChange([...values, ...uploaded]);
      toast.success(`${uploaded.length} فایل آپلود شد`);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) uploadFiles(files);
  };

  const handleRemove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {values.length > 0 && (
        <div className="space-y-2 mb-2">
          {values.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg">
              <FileIcon className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-sm flex-1 truncate">{f.filename}</span>
              <a href={f.url} target="_blank" rel="noreferrer"
                className="p-1.5 rounded hover:bg-slate-200 text-slate-600">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button type="button" onClick={() => handleRemove(i)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {values.length < maxFiles && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={
            'flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ' +
            (dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-500')
          }
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span className="text-sm text-brand-600">در حال آپلود...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600">
                افزودن فایل ({values.length}/{maxFiles})
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}