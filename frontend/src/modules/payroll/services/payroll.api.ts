import { api } from '@/services/api';
import type { Employee, PayrollPeriod, AttendanceRecord, WorkLog, LeaveRequest, AdvanceRequest, SubcontractorStatement } from '@/types/payroll';

export const payrollApi = {
  // ===== Employees =====
  employees: {
    list: async (params?: { active?: boolean; type?: string; search?: string; department?: string }) => {
      const { data } = await api.get<Employee[]>('/payroll/employees', { params });
      return data;
    },
    stats: async () => {
      const { data } = await api.get('/payroll/employees/stats');
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<Employee>('/payroll/employees/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<Employee>('/payroll/employees', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<Employee>('/payroll/employees/' + id, payload);
      return data;
    },
    remove: async (id: string, force?: boolean) => {
      const url = '/payroll/employees/' + id + (force ? '?force=true' : '');
      const { data } = await api.delete(url);
      return data;
    },
        getCard: (id: string) =>
      api.get(`/payroll/employees/${id}/card`).then((r) => r.data),
    getMonthlyWork: (id: string, year: number, month: number) =>
      api.get(`/payroll/employees/${id}/monthly-work`, { params: { year, month } }).then((r) => r.data),
  },

  // ===== Periods =====
  periods: {
    list: async (params?: { year?: number; status?: string; projectId?: string }) => {
      const { data } = await api.get<PayrollPeriod[]>('/payroll/periods', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<PayrollPeriod>('/payroll/periods/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<PayrollPeriod>('/payroll/periods', payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/periods/' + id);
      return data;
    },
    calculate: async (id: string) => {
      const { data } = await api.patch('/payroll/periods/' + id + '/calculate');
      return data;
    },
    calculateFromAttendance: async (id: string) => {
      const { data } = await api.patch('/payroll/periods/' + id + '/calculate-from-attendance');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/payroll/periods/' + id + '/approve');
      return data;
    },
    pay: async (id: string) => {
      const { data } = await api.patch('/payroll/periods/' + id + '/pay');
      return data;
    },
  },

  // ===== Attendance =====
  attendance: {
    list: async (params?: { employeeId?: string; fromDate?: string; toDate?: string; status?: string }) => {
      const { data } = await api.get<AttendanceRecord[]>('/payroll/attendance', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<AttendanceRecord>('/payroll/attendance/' + id);
      return data;
    },
    summary: async (employeeId: string, fromDate: string, toDate: string) => {
      const { data } = await api.get('/payroll/attendance/summary', {
        params: { employeeId, fromDate, toDate },
      });
      return data;
    },
    upsert: async (payload: any) => {
      const { data } = await api.post<AttendanceRecord>('/payroll/attendance', payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/attendance/' + id);
      return data;
    },
    getGrid: async (params: { year: number; month: number; projectId?: string }) => {
      const { data } = await api.get('/payroll/attendance/grid', { params });
      return data;
    },
    bulkUpsert: async (payload: { projectId?: string; items: any[] }) => {
      const { data } = await api.post('/payroll/attendance/bulk', payload);
      return data;
    },
  },

  // ===== Work Logs =====
  workLogs: {
    list: async (params?: { employeeId?: string; projectId?: string; fromDate?: string; toDate?: string }) => {
      const { data } = await api.get<WorkLog[]>('/payroll/work-logs', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<WorkLog>('/payroll/work-logs/' + id);
      return data;
    },
    summary: async (employeeId: string, fromDate: string, toDate: string) => {
      const { data } = await api.get('/payroll/work-logs/summary', {
        params: { employeeId, fromDate, toDate },
      });
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<WorkLog>('/payroll/work-logs', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<WorkLog>('/payroll/work-logs/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/work-logs/' + id);
      return data;
    },
  },

  // ===== Leave Requests =====
  leaveRequests: {
    list: async (params?: { employeeId?: string; status?: string }) => {
      const { data } = await api.get<LeaveRequest[]>('/payroll/leave-requests', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<LeaveRequest>('/payroll/leave-requests/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<LeaveRequest>('/payroll/leave-requests', payload);
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/payroll/leave-requests/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/payroll/leave-requests/' + id + '/reject', { reason });
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/leave-requests/' + id);
      return data;
    },
  },

  // ===== Advance Requests =====
  advanceRequests: {
    list: async (params?: { employeeId?: string; status?: string }) => {
      const { data } = await api.get<AdvanceRequest[]>('/payroll/advance-requests', { params });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<AdvanceRequest>('/payroll/advance-requests/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<AdvanceRequest>('/payroll/advance-requests', payload);
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/payroll/advance-requests/' + id + '/approve');
      return data;
    },
    reject: async (id: string, reason: string) => {
      const { data } = await api.patch('/payroll/advance-requests/' + id + '/reject', { reason });
      return data;
    },
    pay: async (id: string) => {
      const { data } = await api.patch('/payroll/advance-requests/' + id + '/pay');
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/advance-requests/' + id);
      return data;
    },
  },

  // ===== Subcontractor Statements =====
  statements: {
    list: async (params?: { projectId?: string; contractorId?: string; status?: string }) => {
      const { data } = await api.get<SubcontractorStatement[]>('/payroll/subcontractor-statements', { params });
      return data;
    },
    stats: async (projectId?: string) => {
      const { data } = await api.get('/payroll/subcontractor-statements/stats', {
        params: projectId ? { projectId } : {},
      });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get<SubcontractorStatement>('/payroll/subcontractor-statements/' + id);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post<SubcontractorStatement>('/payroll/subcontractor-statements', payload);
      return data;
    },
    update: async (id: string, payload: any, force?: boolean) => {
      const url = '/payroll/subcontractor-statements/' + id + (force ? '?force=true' : '');
      const { data } = await api.patch<SubcontractorStatement>(url, payload);
      return data;
    },
    remove: async (id: string, force?: boolean) => {
      const url = '/payroll/subcontractor-statements/' + id + (force ? '?force=true' : '');
      const { data } = await api.delete(url);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/payroll/subcontractor-statements/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/payroll/subcontractor-statements/' + id + '/approve');
      return data;
    },
    pay: async (id: string) => {
      const { data } = await api.patch('/payroll/subcontractor-statements/' + id + '/pay');
      return data;
    },
  },

  // ===== Worker Statements (صورت‌وضعیت پرسنل) =====
  workerStatements: {
    list: async (params?: { projectId?: string; partnerId?: string; status?: string }) => {
      const { data } = await api.get('/payroll/worker-statements', { params });
      return data;
    },
    stats: async (projectId?: string) => {
      const { data } = await api.get('/payroll/worker-statements/stats', {
        params: projectId ? { projectId } : {},
      });
      return data;
    },
    get: async (id: string) => {
      const { data } = await api.get('/payroll/worker-statements/' + id);
      return data;
    },
    preview: async (payload: {
      partnerId: string; contractId?: string;
      periodStart: string; periodEnd: string;
    }) => {
      const { data } = await api.post('/payroll/worker-statements/preview', payload);
      return data;
    },
    create: async (payload: any) => {
      const { data } = await api.post('/payroll/worker-statements', payload);
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch('/payroll/worker-statements/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      const { data } = await api.delete('/payroll/worker-statements/' + id);
      return data;
    },
    submit: async (id: string) => {
      const { data } = await api.patch('/payroll/worker-statements/' + id + '/submit');
      return data;
    },
    approve: async (id: string) => {
      const { data } = await api.patch('/payroll/worker-statements/' + id + '/approve');
      return data;
    },
    pay: async (id: string) => {
      const { data } = await api.patch('/payroll/worker-statements/' + id + '/pay');
      return data;
    },
  },

};
