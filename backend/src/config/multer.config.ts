import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { extname } from 'path';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.dwg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // حداکثر ۱۰ مگابایت

export const multerUploadOptions = {
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return callback(
        new BadRequestException(
          `فرمت فایل ${ext} مجاز نیست. پسوندهای مجاز: ${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
        false,
      );
    }
    callback(null, true);
  },
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
};