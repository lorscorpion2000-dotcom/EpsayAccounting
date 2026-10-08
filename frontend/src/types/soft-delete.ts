export interface AdminDeleteResult {
  ok: boolean;
  id: string;
  softDeleted?: boolean;
  restored?: boolean;
  deletedBy?: string | null;
  reason?: string | null;
  by?: string | null;
}

export interface DeleteWithReasonDialogProps {
  isOpen: boolean;
  title?: string;
  itemLabel?: string | null;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}
