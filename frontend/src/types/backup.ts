export interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export interface BackupStats {
  backupDir: string;
  total: number;
  totalSizeBytes: number;
  latest: BackupFile | null;
  oldest: BackupFile | null;
}
