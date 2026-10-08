export interface AuditUser {
  id: string;
  username: string;
  fullName: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  user: AuditUser | null;
  action: string;
  entity: string;
  entityId: string | null;
  payload: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditStats {
  total: number;
  todayCount: number;
  byEntity: { entity: string; count: number }[];
  byAction: { action: string; count: number }[];
  topUsers: { userId: string | null; user: AuditUser | null; count: number }[];
}

export interface SecurityStats {
  range: { from: string; to: string };
  total: number;
  byAction: { action: string; count: number }[];
  failedRecent: AuditLogItem[];
  topIps: { ip: string | null; count: number }[];
}
