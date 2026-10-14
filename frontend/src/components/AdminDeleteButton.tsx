import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useAdminDelete } from '@/hooks/useAdminDelete';
import DeleteWithReasonDialog from './DeleteWithReasonDialog';

interface AdminDeleteButtonProps {
  endpoint: string;
  id: string;
  itemLabel?: string;
  onSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'icon-button';
  label?: string;
  title?: string;
}

export default function AdminDeleteButton({
  endpoint,
  id,
  itemLabel,
  onSuccess,
  size = 'md',
  variant = 'icon',
  label = 'حذف دائمی (مدیر)',
  title,
}: AdminDeleteButtonProps) {
  const {
    isDeleting,
    requestDelete,
    dialogOpen,
    dialogItemId,
    dialogItemLabel,
    closeDialog,
    confirmDelete,
  } = useAdminDelete({ endpoint, onSuccess, label: itemLabel || label });

  const sizeClass = size === 'sm' ? 'p-1' : size === 'lg' ? 'p-3' : 'p-1.5';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestDelete(id, itemLabel);
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleClick}
          className={clsx(sizeClass, 'rounded-lg hover:bg-red-50 text-red-600 transition-colors')}
          title={title || 'حذف دائمی (فقط مدیر ارشد)'}
        >
          <AlertTriangle className={iconClass} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-1.5"
          title={title}
        >
          <AlertTriangle className={iconClass} />
          {variant === 'button' && label}
        </button>
      )}

      <DeleteWithReasonDialog
        isOpen={dialogOpen && dialogItemId === id}
        title={'حذف ' + (itemLabel || label)}
        itemLabel={dialogItemLabel}
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      />
    </>
  );
}
