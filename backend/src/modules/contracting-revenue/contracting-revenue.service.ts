import * as jalaali from 'jalaali-js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import ExcelJS from 'exceljs';

export interface RevenueFilters {
  fromDate?: string;
  toDate?: string;
  projectId?: string;
  clientId?: string;
  groupBy?: 'month' | 'quarter';
}

@Injectable()
export class ContractingRevenueService {
  constructor(private prisma: PrismaService) {}

  private statementWhere(f: RevenueFilters): any {
    const where: any = {
      deletedAt: null,
      status: { in: ['APPROVED', 'PAID'] },
    };
    if (f.projectId) where.projectId = f.projectId;
    if (f.fromDate || f.toDate) {
      where.periodEnd = {};
      if (f.fromDate) where.periodEnd.gte = new Date(f.fromDate);
      if (f.toDate) where.periodEnd.lte = new Date(f.toDate);
    }
    if (f.clientId) where.project = { clientId: f.clientId };
    return where;
  }

  private expenseWhere(f: RevenueFilters): any {
    const where: any = {
      status: 'POSTED',
      costType: 'COMPANY',
    };
    if (f.projectId) where.projectId = f.projectId;
    if (f.clientId) where.project = { clientId: f.clientId };
    if (f.fromDate || f.toDate) {
      where.expenseDate = {};
      if (f.fromDate) where.expenseDate.gte = new Date(f.fromDate);
      if (f.toDate) where.expenseDate.lte = new Date(f.toDate);
    }
    return where;
  }

  async summary(f: RevenueFilters) {
    const [stmts, exps] = await Promise.all([
      this.prisma.clientStatement.findMany({
        where: this.statementWhere(f),
        select: {
          id: true,
          projectId: true,
          totalAfterCoefficient: true,
          netPayable: true,
          passThroughAmount: true,
        },
      }),
      this.prisma.expense.findMany({
        where: this.expenseWhere(f),
        select: { id: true, totalAmount: true },
      }),
    ]);

    const totalRevenue = stmts.reduce((s, x) => s + Number(x.totalAfterCoefficient), 0);
    const totalNetPayable = stmts.reduce((s, x) => s + Number(x.netPayable), 0);
    const totalPassThrough = stmts.reduce((s, x) => s + Number(x.passThroughAmount), 0);
    const totalCost = exps.reduce((s, x) => s + Number(x.totalAmount), 0);
    const profit = totalRevenue - totalCost;

    return {
      totalRevenue,
      totalNetPayable,
      totalPassThrough,
      totalCost,
      profit,
      margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
      statementCount: stmts.length,
      projectCount: new Set(stmts.map((x) => x.projectId)).size,
    };
  }

  async byProject(f: RevenueFilters) {
    const [stmts, exps, projects] = await Promise.all([
      this.prisma.clientStatement.findMany({
        where: this.statementWhere(f),
        select: { projectId: true, totalAfterCoefficient: true, netPayable: true },
      }),
      this.prisma.expense.findMany({
        where: this.expenseWhere(f),
        select: { projectId: true, totalAmount: true },
      }),
      this.prisma.project.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    const map = new Map<string, any>();
    for (const p of projects) {
      map.set(p.id, {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        clientId: p.client?.id || null,
        clientName: p.client?.name || null,
        revenue: 0,
        netPayable: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      });
    }
    for (const s of stmts) {
      const r = map.get(s.projectId);
      if (!r) continue;
      r.revenue += Number(s.totalAfterCoefficient);
      r.netPayable += Number(s.netPayable);
    }
    for (const e of exps) {
      if (!e.projectId) continue;
      const r = map.get(e.projectId);
      if (!r) continue;
      r.cost += Number(e.totalAmount);
    }
    return Array.from(map.values())
      .filter((r) => r.revenue > 0 || r.cost > 0)
      .map((r) => {
        r.profit = r.revenue - r.cost;
        r.margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
        return r;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  async byClient(f: RevenueFilters) {
    const byProject = await this.byProject(f);
    const map = new Map<string, any>();
    for (const r of byProject) {
      const key = r.clientId || '__none__';
      let row = map.get(key);
      if (!row) {
        row = {
          clientId: r.clientId,
          clientName: r.clientName || 'بدون کارفرما',
          revenue: 0,
          netPayable: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          projectCount: 0,
        };
        map.set(key, row);
      }
      row.revenue += r.revenue;
      row.netPayable += r.netPayable;
      row.cost += r.cost;
      row.projectCount += 1;
    }
    return Array.from(map.values())
      .map((r) => {
        r.profit = r.revenue - r.cost;
        r.margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
        return r;
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  async byPeriod(f: RevenueFilters) {
    const groupBy = f.groupBy || 'month';
    const [stmts, exps] = await Promise.all([
      this.prisma.clientStatement.findMany({
        where: this.statementWhere(f),
        select: { periodEnd: true, totalAfterCoefficient: true },
      }),
      this.prisma.expense.findMany({
        where: this.expenseWhere(f),
        select: { expenseDate: true, totalAmount: true },
      }),
    ]);

    const buckets = new Map<string, { period: string; revenue: number; cost: number; profit: number }>();
    const keyOf = (d: Date): string => {
      if (!d) return '';
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return '';
      const j = jalaali.toJalaali(dateObj);
      if (groupBy === 'quarter') return j.jy + '-Q' + (Math.floor((j.jm - 1) / 3) + 1);
      return j.jy + '-' + String(j.jm).padStart(2, '0');
    };
    const ensure = (k: string) => {
      if (!buckets.has(k)) buckets.set(k, { period: k, revenue: 0, cost: 0, profit: 0 });
      return buckets.get(k)!;
    };
    for (const s of stmts) ensure(keyOf(s.periodEnd)).revenue += Number(s.totalAfterCoefficient);
    for (const e of exps) ensure(keyOf(e.expenseDate)).cost += Number(e.totalAmount);
    return Array.from(buckets.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((r) => {
        r.profit = r.revenue - r.cost;
        return r;
      });
  }

  async projectsList() {
    const projects = await this.prisma.project.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
    return projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      clientId: p.client?.id || null,
      clientName: p.client?.name || null,
    }));
  }

  async clientsList() {
    const clients = await this.prisma.partner.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return clients;
  }

  async exportExcel(f: RevenueFilters): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Epsay Accounting';
    wb.created = new Date();

    const sum = await this.summary(f);
    const ws1 = wb.addWorksheet('خلاصه');
    ws1.addRow(['شاخص', 'مقدار']);
    ws1.addRow(['جمع درآمد پیمانکاری', sum.totalRevenue]);
    ws1.addRow(['خالص قابل وصول', sum.totalNetPayable]);
    ws1.addRow(['هزینه کارفرما', sum.totalPassThrough]);
    ws1.addRow(['هزینه‌های شرکت', sum.totalCost]);
    ws1.addRow(['سود', sum.profit]);
    ws1.addRow(['حاشیه سود (%)', Number(sum.margin.toFixed(2))]);
    ws1.addRow(['تعداد صورت‌وضعیت', sum.statementCount]);
    ws1.addRow(['تعداد پروژه', sum.projectCount]);

    const byP = await this.byProject(f);
    const ws2 = wb.addWorksheet('به تفکیک پروژه');
    ws2.addRow(['کد پروژه', 'نام پروژه', 'کارفرما', 'درآمد', 'خالص قابل وصول', 'هزینه', 'سود', 'حاشیه %']);
    for (const r of byP) {
      ws2.addRow([
        r.projectCode,
        r.projectName,
        r.clientName || '',
        r.revenue,
        r.netPayable,
        r.cost,
        r.profit,
        Number(r.margin.toFixed(2)),
      ]);
    }

    const byC = await this.byClient(f);
    const ws3 = wb.addWorksheet('به تفکیک کارفرما');
    ws3.addRow(['کارفرما', 'درآمد', 'خالص قابل وصول', 'هزینه', 'سود', 'حاشیه %', 'تعداد پروژه']);
    for (const r of byC) {
      ws3.addRow([
        r.clientName,
        r.revenue,
        r.netPayable,
        r.cost,
        r.profit,
        Number(r.margin.toFixed(2)),
        r.projectCount,
      ]);
    }

    const byPr = await this.byPeriod(f);
    const ws4 = wb.addWorksheet('به تفکیک دوره');
    ws4.addRow(['دوره', 'درآمد', 'هزینه', 'سود']);
    for (const r of byPr) {
      ws4.addRow([r.period, r.revenue, r.cost, r.profit]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
