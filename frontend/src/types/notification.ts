export type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER';

export interface NotificationItem {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  entity: string;
  entityId: string;
  link: string | null;
  dueDate: string | null;
  daysLeft: number | null;
  isRead: boolean;
  readAt: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}
