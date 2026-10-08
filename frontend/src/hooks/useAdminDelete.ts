import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/services/api';

interface UseAdminDeleteOptions {
  /** Endpoint base, e.g. '/adjustments' */
  endpoint: string;
  /** Callback after successful delete (usually reload list) */
  onSuccess?: () => void;
  /** Permission label shown in errors */
  label?: string;
}

interface UseAdminDeleteResult {
  isDeleting: boolean;
  isRestoring: boolean;
  /** Opens the reason dialog for a given id */
  requestDelete: (id: string, label?: string) => void;
  /** Direct restore */
  restore: (id: string) => Promise<void>;
  /** Dialog controls */
  dialogOpen: boolean;
  dialogItemId: string | null;
  dialogItemLabel: string | null;
  closeDialog: () => void;
  confirmDelete: (reason: string) => Promise<void>;
}

export function useAdminDelete({
  endpoint,
  onSuccess,
  label = 'آیتم',
}: UseAdminDeleteOptions): UseAdminDeleteResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [dialogItemLabel, setDialogItemLabel] = useState<string | null>(null);

  const requestDelete = (id: string, itemLabel?: string) => {
    setDialogItemId(id);
    setDialogItemLabel(itemLabel || null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isDeleting) return;
    setDialogOpen(false);
    setDialogItemId(null);
    setDialogItemLabel(null);
  };

  const confirmDelete = async (reason: string) => {
    if (!dialogItemId) return;
    setIsDeleting(true);
    try {
      await api.delete(endpoint + '/' + dialogItemId + '/admin', {
        data: { reason },
      });
      toast.success(label + ' با موفقیت حذف شد');
      setDialogOpen(false);
      setDialogItemId(null);
      setDialogItemLabel(null);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'خطا در حذف';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const restore = async (id: string) => {
    setIsRestoring(true);
    try {
      await api.patch(endpoint + '/' + id + '/restore');
      toast.success(label + ' بازیابی شد');
      if (onSuccess) onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'خطا در بازیابی';
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    isDeleting,
    isRestoring,
    requestDelete,
    restore,
    dialogOpen,
    dialogItemId,
    dialogItemLabel,
    closeDialog,
    confirmDelete,
  };
}
