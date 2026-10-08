// Fix attachments: soft delete + permission checks
import fs from 'node:fs';
import path from 'node:path';

const BACKEND = 'E:\\EpsayAccounting\\backend';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// 1) attachments.service.ts
console.log('\n--- attachments.service.ts ---');
const svcPath = path.join(BACKEND, 'src', 'modules', 'attachments', 'attachments.service.ts');
fs.copyFileSync(svcPath, `${svcPath}.bak-${STAMP}`);
let svc = fs.readFileSync(svcPath, 'utf8');

const oldRemove = `async remove(id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('پیوست پیدا نشد');
    await this.prisma.attachment.delete({ where: { id } });
    return { success: true };
  }`;

const newRemove = `async remove(id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('پیوست پیدا نشد');
    if ((a as any).deletedAt) {
      throw new BadRequestException('پیوست قبلاً حذف شده است');
    }
    await this.prisma.attachment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: null,
      } as any,
    });
    return { success: true, softDeleted: true };
  }`;

if (svc.includes(oldRemove)) {
  svc = svc.replace(oldRemove, newRemove);
  console.log('  OK remove() → soft delete');
} else {
  console.log('  FAIL: remove pattern not found');
}

const oldAdmin = `async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    // For hard delete by admin — soft delete first then optionally purge
    // For safety we only do soft delete by default; uncomment hard delete below if needed
    return this.softDelete(id, userId, reason || 'admin-delete', meta);
  }`;

const newAdmin = `async adminDelete(id: string, userId?: string, reason?: string, meta: any = {}) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('پیوست پیدا نشد');

    try {
      const urlPath = (a.url || '').replace(/^\\/api\\/uploads/, '');
      if (urlPath) {
        const fullPath = path.join(process.cwd(), 'uploads', urlPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (e) {
      // silent
    }

    await this.prisma.attachment.delete({ where: { id } });
    return { success: true, hardDeleted: true, id, by: userId || null, reason: reason || null };
  }`;

if (svc.includes(oldAdmin)) {
  svc = svc.replace(oldAdmin, newAdmin);
  console.log('  OK adminDelete() → hard delete + file removal');
} else {
  console.log('  FAIL: adminDelete pattern not found');
}

if (!svc.includes("from 'node:fs'")) {
  svc = svc.replace(
    `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';`,
    `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';\nimport * as fs from 'node:fs';\nimport * as path from 'node:path';`
  );
  console.log('  OK import fs/path added');
}

fs.writeFileSync(svcPath, svc, 'utf8');

// 2) attachments.controller.ts
console.log('\n--- attachments.controller.ts ---');
const ctrlPath = path.join(BACKEND, 'src', 'modules', 'attachments', 'attachments.controller.ts');
fs.copyFileSync(ctrlPath, `${ctrlPath}.bak-${STAMP}`);
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

const oldDelete = `@Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }`;

const newDelete = `@Delete(':id')
  @RequirePermissions('attachment.delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }`;

if (ctrl.includes(oldDelete)) {
  ctrl = ctrl.replace(oldDelete, newDelete);
  console.log('  OK permission on DELETE :id');
} else {
  console.log('  WARN: DELETE :id pattern not found');
}

fs.writeFileSync(ctrlPath, ctrl, 'utf8');

console.log('\n=== DONE ===');