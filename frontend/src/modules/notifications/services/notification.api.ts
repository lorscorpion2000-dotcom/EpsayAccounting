import { api } from '@/services/api';
import type { NotificationItem } from '@/types/notification';

export const notificationApi = {
  list: (params?: { unread?: boolean; limit?: number }) =>
    api.get<NotificationItem[]>('/notifications', { params }).then((r) => r.data),
  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) =>
    api.patch('/notifications/' + id + '/read').then((r) => r.data),
  markAllRead: () =>
    api.post('/notifications/read-all').then((r) => r.data),
  scan: () =>
    api.post('/notifications/scan').then((r) => r.data),
  clearRead: () =>
    api.post('/notifications/clear-read').then((r) => r.data),
  remove: (id: string) =>
    api.delete('/notifications/' + id).then((r) => r.data),
};
