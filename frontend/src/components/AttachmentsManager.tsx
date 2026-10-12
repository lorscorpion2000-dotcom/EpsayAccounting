import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, X, Loader2, File as FileIcon, ExternalLink, Paperclip } from 'lucide-react';
import { api } from '@/services/api';
import { attachmentsApi, Attachment, AttachmentInput } from '@/services/attachments.api';

interface Props {
  entityType: string;
  entityId?: string | null;
  label?: string;
  maxSizeMb?: number;
  maxFiles?: number;
  accept?: string;
  /** حالت uncontrolled — برای entity جدید که هنوز id ندارد */
  pendingFiles?: AttachmentInput[];
  onPendingChange?: (files: AttachmentInput[]) => void;
}

export default function AttachmentsManager({
  entityType,
  entityId,
  label = 'پیوست‌ها',
  maxSizeMb = 10,
  maxFiles = 20,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx',
  pendingFiles = [],
  onPendingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isNew = !entityId;

  // بارگذاری اولیه (فقط در حالت ویرایش)
  useEffect(() => {
    if (!entityId) {
      setItems([]);
      return;
    }
    setLoading(true);
    attachmentsApi
      .list(entityType, entityId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  const totalCount = isNew ? pendingFiles.length : items.length;

  const uploadToServer = async (file: File): Promise<AttachmentInput | null> => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(file.name + ' بزرگ‌تر از ' + maxSizeMb + 'MB است');
      return null;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string; filename: string; size: number; mimetype: string }>(
        '/upload',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return {
        url: data.url,
        filename: data.filename || file.name,
        size: data.size || file.size,
        mimetype: data.mimetype || file.type,
      };
    } catch (err: any) {
      const m = err?.response?.data?.message;
      toast.error((Array.isArray(m) ? m[0] : m) || ('خطا در آپلود ' + file.name));
      return null;
    }
  };

  const handleFiles = async (files: File[]) => {
    if (totalCount + files.length > maxFiles) {
      toast.error('حداکثر ' + maxFiles + ' فایل مجاز است');
      return;
    }
    setUploading(true);

    const uploaded: AttachmentInput[] = [];
    for (const f of files) {
      const result = await uploadToServer(f);
      if (result) uploaded.push(result);
    }

    if (uploaded.length) {
      if (isNew) {
        // فقط در state ذخیره کن
        onPendingChange?.([...pendingFiles, ...uploaded]);
        toast.success(uploaded.length + ' فایل اضافه شد (پس از ذخیره، ثبت می‌شود)');
      } else if (entityId) {
        // ذخیره فوری در بک‌اند
        try {
          await attachmentsApi.createMany(entityType, entityId, uploaded);
          const fresh = await attachmentsApi.list(entityType, entityId);
          setItems(fresh);
          toast.success(uploaded.length + ' فایل ذخیره شد');
        } catch {
          toast.error('خطا در ذخیره پیوست‌ها');
        }
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemovePending = (idx: number) => {
    if (!onPendingChange) return;
    onPendingChange(pendingFiles.filter((_, i) => i !== idx));
  };

  const handleRemoveSaved = async (id: string) => {
    try {
      await attachmentsApi.remove(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success('حذف شد');
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const list = isNew ? pendingFiles : items;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700 flex items-center gap-1">
          <Paperclip className="w-3.5 h-3.5" />
          {label}
          {list.length > 0 && (
            <span className="text-xs text-slate-400 num">({list.length})</span>
          )}
        </label>
      </div>

      {loading ? (
        <div className="p-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* لیست فایل‌ها */}
          {list.length > 0 && (
            <div className="space-y-2 mb-3">
              {list.map((f: any, i: number) => {
                const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url || f.filename);
                return (
                  <div
                    key={f.id || i}
                    className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg group"
                  >
                    {isImg ? (
                      <img
                        src={f.url}
                        alt={f.filename}
                        className="w-10 h-10 object-cover rounded border shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-white rounded border shrink-0">
                        <FileIcon className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{f.filename}</div>
                      {f.size && (
                        <div className="text-xs text-slate-400 num">
                          {(f.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 shrink-0"
                      title="مشاهده"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => (isNew ? handleRemovePending(i) : handleRemoveSaved(f.id))}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600 shrink-0"
                      title="حذف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* دکمه آپلود */}
          {list.length < maxFiles && (
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length) handleFiles(files);
              }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              className={
                'flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ' +
                (dragOver ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-slate-300 hover:border-brand-500 hover:bg-brand-50/30')
              }
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span className="text-sm text-brand-600">در حال آپلود...</span>
                </>
              ) : dragOver ? (
                <>
                  <Upload className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-medium text-brand-600">فایل‌ها را رها کنید</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    افزودن فایل ({list.length}/{maxFiles})
                  </span>
                  <span className="text-xs text-slate-400 hidden md:inline">
                    · حداکثر {maxSizeMb}MB
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
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleFiles(files);
            }}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
