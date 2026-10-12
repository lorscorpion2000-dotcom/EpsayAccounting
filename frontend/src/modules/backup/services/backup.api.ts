import { api } from '@/services/api';
import type { BackupFile, BackupStats } from '@/types/backup';

export const backupApi = {
  list: () => api.get<BackupFile[]>('/backups').then((r) => r.data),
  stats: () => api.get<BackupStats>('/backups/stats').then((r) => r.data),
  run: () => api.post('/backups/run').then((r) => r.data),
  remove: (filename: string) =>
    api.delete(`/backups/${encodeURIComponent(filename)}`).then((r) => r.data),
};
