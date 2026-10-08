import { RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { api } from '@/services/api';

interface AdminRestoreButtonProps {
  endpoint: string;
  id: string;
  itemLabel?: string;
  onSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  label?: string;
}

export default function AdminRestoreButton(props: AdminRestoreButtonProps) {
  const {
    endpoint,
    id,
    itemLabel,
    onSuccess,
    size = 'md',
    variant = 'icon',
    label = 'بازیابی',
  } = props;

  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    const ok = window.confirm('آیا از بازیابی ' + (itemLabel || label) + ' مطمئن هستید؟');
    if (!ok) return;

    setLoading(true);
    try {
      await api.patch(endpoint + '/' + id + '/restore');
      toast.success('با موفقیت بازیابی شد');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'خطا در بازیابی');
    } finally {
      setLoading(false);
    }
  };

  const sizeClass = size === 'sm' ? 'p-1' : size === 'lg' ? 'p-3' : 'p-1.5';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={clsx(
        variant === 'icon'
          ? sizeClass + ' rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors'
          : 'btn-secondary text-emerald-600 hover:bg-emerald-50 flex items-center gap-1.5',
        loading && 'opacity-50',
      )}
      title={label}
    >
      {loading ? (
        <Loader2 className={clsx(iconClass, 'animate-spin')} />
      ) : (
        <RotateCcw className={iconClass} />
      )}
      {variant === 'button' && label}
    </button>
  );
}
