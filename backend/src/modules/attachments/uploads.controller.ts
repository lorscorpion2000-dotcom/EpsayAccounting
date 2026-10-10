import { Controller, Get, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Uploads - فایل‌ها')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Get(':filename')
  async serve(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    if (!safe || safe.includes('..') || safe.includes('/') || safe.includes('\\')) {
      throw new NotFoundException('فایل یافت نشد');
    }
    const filePath = join(process.cwd(), 'uploads', safe);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new NotFoundException('فایل یافت نشد');
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(filePath).pipe(res);
  }
}
