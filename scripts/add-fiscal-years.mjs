import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════ 1) Backend Service — افزودن setCurrent/update/remove ═══════════
const svcPath = ROOT + '/backend/src/modules/accounting/fiscal-years.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

// fix imports
svc = svc.replace(
  "import { Injectable, NotFoundException } from '@nestjs/common';",
  "import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';"
);

// append methods before final }
const newMethods = `
  async setCurrent(id: string) {
    const fy = await this.findOne(id);
    if (fy.status !== 'OPEN') {
      throw new BadRequestException('فقط سال مالی باز می‌تواند جاری شود');
    }
    await this.prisma.fiscalYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });
    return this.prisma.fiscalYear.update({
      where: { id },
      data: { isCurrent: true },
    });
  }

  async update(id: string, dto: Partial<CreateFiscalYearDto>) {
    await this.findOne(id);
    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    return this.prisma.fiscalYear.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.journalEntry.count({ where: { fiscalYearId: id } });
    if (count > 0) {
      throw new BadRequestException('این سال مالی اسناد دارد و قابل حذف نیست — می‌توانید ببندید');
    }
    return this.prisma.fiscalYear.delete({ where: { id } });
  }
`;

// insert before last } of class
const lastBrace = svc.lastIndexOf('}');
svc = svc.slice(0, lastBrace) + newMethods + svc.slice(lastBrace);
fs.writeFileSync(svcPath, svc, 'utf8');
console.log('OK fiscal-years.service.ts');

// ═══════════ 2) Backend Controller — افزودن endpointها ═══════════
const ctrlPath = ROOT + '/backend/src/modules/accounting/fiscal-years.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

// fix imports
ctrl = ctrl.replace(
  "import { Body, Controller, Get, Param, Post } from '@nestjs/common';",
  "import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';"
);

// add endpoints before final }
const newEndpoints = `
  @Patch(':id/set-current')
  @RequirePermissions('accounting.update')
  setCurrent(@Param('id') id: string) {
    return this.service.setCurrent(id);
  }

  @Patch(':id')
  @RequirePermissions('accounting.update')
  update(@Param('id') id: string, @Body() dto: CreateFiscalYearDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('accounting.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
`;

const lastBraceC = ctrl.lastIndexOf('}');
ctrl = ctrl.slice(0, lastBraceC) + newEndpoints + ctrl.slice(lastBraceC);
fs.writeFileSync(ctrlPath, ctrl, 'utf8');
console.log('OK fiscal-years.controller.ts');

// ═══════════ 3) Frontend API ═══════════
const apiPath = ROOT + '/frontend/src/modules/accounting/services/accounting.api.ts';
let api = fs.readFileSync(apiPath, 'utf8');

if (!api.includes('setCurrent')) {
  // پیدا کردن بلاک fiscalYears
  const fyEnd = api.indexOf('},', api.indexOf('fiscalYears: {'));
  if (fyEnd > 0) {
    const inject = `
    setCurrent: async (id: string) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id + '/set-current');
      return data;
    },
    update: async (id: string, payload: any) => {
      const { data } = await api.patch<FiscalYear>('/fiscal-years/' + id, payload);
      return data;
    },
    remove: async (id: string) => {
      await api.delete('/fiscal-years/' + id);
    },
`;
    // درج قبل از بسته شدن fiscalYears
    api = api.slice(0, fyEnd) + inject + api.slice(fyEnd);
    fs.writeFileSync(apiPath, api, 'utf8');
    console.log('OK accounting.api.ts');
  } else {
    console.log('!! fy block not found in api');
  }
} else {
  console.log('SKIP api (already)');
}

console.log('');
console.log('=== DONE (backend + api) ===');