import fs from 'node:fs';
const ROOT = 'E:/EpsayAccounting';

// ═══════════════════════════════════════════════════════════════
// 1) Schema — مدل Attachment
// ═══════════════════════════════════════════════════════════════
const sp = ROOT + '/backend/prisma/schema.prisma';
let s = fs.readFileSync(sp, 'utf8');

if (!s.includes('model Attachment {')) {
  const model = `

// ═══════════════════════════════════════════════════════════════
//  پیوست‌های عمومی (چند فایل برای هر entity)
// ═══════════════════════════════════════════════════════════════

model Attachment {
  id           String   @id @default(uuid()) @db.Uuid
  entityType   String   @map("entity_type") @db.VarChar(32)
  entityId     String   @map("entity_id") @db.Uuid

  filename     String   @db.VarChar(255)
  url          String   @db.VarChar(500)
  size         Int?
  mimetype     String?  @db.VarChar(100)
  description  String?  @db.VarChar(500)

  uploadedById String?  @map("uploaded_by_id") @db.Uuid
  uploadedBy   User?    @relation("AttachmentUploader", fields: [uploadedById], references: [id])

  createdAt    DateTime @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([uploadedById])
  @@map("attachments")
}
`;

  // Insert before last "}" (end of file)
  const lastBrace = s.lastIndexOf('}');
  s = s.slice(0, lastBrace + 1) + model;
  fs.writeFileSync(sp, s, 'utf8');
  console.log('OK Attachment model');

  // Add reverse relation to User
  if (!s.includes('attachmentsUploaded')) {
    let s2 = fs.readFileSync(sp, 'utf8');
    s2 = s2.replace(
      '  themePreference             String?                  @map("theme_preference") @db.VarChar(64)',
      '  themePreference             String?                  @map("theme_preference") @db.VarChar(64)\n\n  attachmentsUploaded         Attachment[]             @relation("AttachmentUploader")'
    );
    fs.writeFileSync(sp, s2, 'utf8');
    console.log('OK User reverse relation');
  }
} else {
  console.log('SKIP Attachment (already)');
}

// ═══════════════════════════════════════════════════════════════
// 2) Backend Module — Attachment
// ═══════════════════════════════════════════════════════════════
const modContent = `import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
`;

const svcContent = `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async list(entityType: string, entityId: string) {
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType و entityId الزامی هستند');
    }
    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async createMany(data: {
    entityType: string;
    entityId: string;
    files: { filename: string; url: string; size?: number; mimetype?: string }[];
    uploadedById?: string;
  }) {
    if (!data.entityType || !data.entityId) {
      throw new BadRequestException('entityType و entityId الزامی هستند');
    }
    if (!data.files || !data.files.length) {
      throw new BadRequestException('حداقل یک فایل الزامی است');
    }
    return this.prisma.attachment.createMany({
      data: data.files.map((f) => ({
        entityType: data.entityType,
        entityId: data.entityId,
        filename: f.filename,
        url: f.url,
        size: f.size,
        mimetype: f.mimetype,
        uploadedById: data.uploadedById,
      })),
    });
  }

  async remove(id: string) {
    const a = await this.prisma.attachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('پیوست پیدا نشد');
    await this.prisma.attachment.delete({ where: { id } });
    return { success: true };
  }
}
`;

const ctrlContent = `import {
  Body, Controller, Delete, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Attachments - پیوست‌ها')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.list(entityType, entityId);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.createMany(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
`;

fs.mkdirSync(ROOT + '/backend/src/modules/attachments', { recursive: true });
fs.writeFileSync(ROOT + '/backend/src/modules/attachments/attachments.module.ts', modContent, 'utf8');
fs.writeFileSync(ROOT + '/backend/src/modules/attachments/attachments.service.ts', svcContent, 'utf8');
fs.writeFileSync(ROOT + '/backend/src/modules/attachments/attachments.controller.ts', ctrlContent, 'utf8');
console.log('OK attachments module (3 فایل)');

// ═══════════════════════════════════════════════════════════════
// 3) app.module.ts
// ═══════════════════════════════════════════════════════════════
const appPath = ROOT + '/backend/src/app.module.ts';
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes('AttachmentsModule')) {
  app = app.replace(
    "import { UploadModule } from './common/upload/upload.module';",
    "import { UploadModule } from './common/upload/upload.module';\nimport { AttachmentsModule } from './modules/attachments/attachments.module';"
  );
  app = app.replace('UploadModule,', 'UploadModule,\n    AttachmentsModule,');
  fs.writeFileSync(appPath, app, 'utf8');
  console.log('OK app.module.ts');
} else {
  console.log('SKIP app.module');
}

console.log('');
console.log('=== DONE ===');