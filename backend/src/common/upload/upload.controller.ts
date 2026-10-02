import {
  Controller, Post, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const d = new Date();
          const yyyy = String(d.getFullYear());
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dir = join(process.cwd(), 'uploads', yyyy, mm);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(new BadRequestException('فرمت فایل مجاز نیست'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('فایلی ارسال نشد');
    const rel = file.path.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\/uploads/, '');
    return {
      url: '/api/uploads' + rel,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}