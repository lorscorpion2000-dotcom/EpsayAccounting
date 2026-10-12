import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import {
  isAllowedExtension,
  isAllowedMime,
  matchesMagic,
  safeFilename,
  fileExtLower,
} from './file-validation.util';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10) * 1024 * 1024;
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST || '10', 10);

// ذخیره‌سازی روی دیسک
const storage = diskStorage({
  destination: (_req, _file, cb) => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dir = join(process.cwd(), 'uploads', yyyy, mm);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = safeFilename(file.originalname);
    const ext = fileExtLower(safe) || '.bin';
    const base = safe.slice(0, safe.length - ext.length) || 'file';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + base + ext;
    cb(null, name); // ← باگ fix شد
  },
});

// فیلتر فایل
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (!file || !file.originalname) {
    return cb(new BadRequestException('Invalid file'), false);
  }

  if (!isAllowedExtension(file.originalname)) {
    return cb(new BadRequestException('File extension not allowed'), false);
  }

  if (file.mimetype && !isAllowedMime(file.mimetype)) {
    return cb(new BadRequestException('File MIME type not allowed'), false);
  }

  cb(null, true);
};

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter,
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    // چک magic bytes (محتوا)
    try {
      const fh = await import('node:fs/promises');
      const fd = await fh.open(file.path, 'r');
      const buf = Buffer.alloc(12);
      await fd.read(buf, 0, 12, 0);
      await fd.close();

      if (!matchesMagic(buf, file.originalname)) {
        await fh.unlink(file.path).catch(() => {});
        throw new BadRequestException(
          'File content does not match its extension',
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // اگه magic bytes fail داد به هر دلیل، اجازه بده (fail-open)
    }

    const rel = file.path
      .replace(process.cwd(), '')
      .replace(/\\/g, '/')
      .replace(/^\/uploads/, '');

    return {
      url: '/api/uploads' + rel,
      size: file.size,
      mimetype: file.mimetype,
      filename: file.filename,
    };
  }

  @Post('multi')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      storage,
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
      fileFilter,
    }),
  )
  async uploadMulti(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || !files.length) {
      throw new BadRequestException('No files provided');
    }

    const fh = await import('node:fs/promises');
    const results: any[] = [];

    for (const file of files) {
      try {
        const fd = await fh.open(file.path, 'r');
        const buf = Buffer.alloc(12);
        await fd.read(buf, 0, 12, 0);
        await fd.close();

        if (!matchesMagic(buf, file.originalname)) {
          await fh.unlink(file.path).catch(() => {});
          continue; // skip invalid, not fail whole request
        }

        const rel = file.path
          .replace(process.cwd(), '')
          .replace(/\\/g, '/')
          .replace(/^\/uploads/, '');

        results.push({
          url: '/api/uploads' + rel,
          size: file.size,
          mimetype: file.mimetype,
          filename: file.filename,
        });
      } catch {
        // skip invalid
      }
    }

    if (!results.length) {
      throw new BadRequestException('No valid files uploaded');
    }

    return { files: results, skipped: files.length - results.length };
  }
}
