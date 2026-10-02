import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Backend Service — افزودن close/reopen
// ═══════════════════════════════════════════════════════════════
const svcPath = ROOT + '/backend/src/modules/accounting/fiscal-years.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

if (!svc.includes('async close(')) {
  const newMethods = `
  async close(id: string) {
    const fy = await this.findOne(id);
    if (fy.status === 'CLOSED') {
      throw new BadRequestException('این سال مالی قبلاً بسته شده است');
    }

    // بررسی عدم وجود اسناد DRAFT
    const draftCount = await this.prisma.journalEntry.count({
      where: { fiscalYearId: id, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      throw new BadRequestException('ابتدا ' + draftCount + ' سند پیش‌نویس را ثبت یا ابطال کنید');
    }

    await this.prisma.fiscalYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'CLOSED', isCurrent: false },
    });
  }

  async reopen(id: string) {
    const fy = await this.findOne(id);
    if (fy.status !== 'CLOSED') {
      throw new BadRequestException('این سال مالی بسته نیست');
    }
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'OPEN' },
    });
  }

  async summary(id: string) {
    const fy = await this.findOne(id);
    const [totalEntries, draftCount, postedCount, reversedCount] = await Promise.all([
      this.prisma.journalEntry.count({ where: { fiscalYearId: id } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'DRAFT' } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'POSTED' } }),
      this.prisma.journalEntry.count({ where: { fiscalYearId: id, status: 'REVERSED' } }),
    ]);
    return { totalEntries, draftCount, postedCount, reversedCount };
  }
`;

  const lastBrace = svc.lastIndexOf('}');
  svc = svc.slice(0, lastBrace) + newMethods + svc.slice(lastBrace);
  fs.writeFileSync(svcPath, svc, 'utf8');
  console.log('OK fiscal-years.service.ts');
} else {
  console.log('SKIP service (already)');
}

// ═══════════════════════════════════════════════════════════════
// 2) Backend Controller — افزودن endpointها
// ═══════════════════════════════════════════════════════════════
const ctrlPath = ROOT + '/backend/src/modules/accounting/fiscal-years.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

if (!ctrl.includes('async close')) {
  const newEndpoints = `
  @Patch(':id/close')
  @RequirePermissions('accounting.update')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  @Patch(':id/reopen')
  @RequirePermissions('accounting.update')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Get(':id/summary')
  @RequirePermissions('accounting.read')
  summary(@Param('id') id: string) {
    return this.service.summary(id);
  }
`;
  const lastBrace = ctrl.lastIndexOf('}');
  ctrl = ctrl.slice(0, lastBrace) + newEndpoints + ctrl.slice(lastBrace);
  fs.writeFileSync(ctrlPath, ctrl, 'utf8');
  console.log('OK fiscal-years.controller.ts');
} else {
  console.log('SKIP controller (already)');
}

// ═══════════════════════════════════════════════════════════════
// 3) Frontend API
// ═══════════════════════════════════════════════════════════════
const apiPath = ROOT + '/frontend/src/modules/accounting/services/accounting.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes("'/close'")) {
  const old = `    remove: async (id: string) => {
      await api.delete('/fiscal-years/' + id);
    },`;
  const neu = `    remove: async (id: string) => {
      await api.delete('/fiscal-years/' + id);
    },
    close: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/close');
      return data;
    },
    reopen: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/reopen');
      return data;
    },
    summary: async (id: string) => {
      const { data } = await api.get('/fiscal-years/' + id + '/summary');
      return data;
    },`;
  if (api.includes(old)) {
    api = api.replace(old, neu);
    fs.writeFileSync(apiPath, api, 'utf8');
    console.log('OK accounting.api.ts');
  } else {
    console.log('SKIP api (anchor not found)');
  }
} else {
  console.log('SKIP api (already)');
}

console.log('');
console.log('=== DONE ===');