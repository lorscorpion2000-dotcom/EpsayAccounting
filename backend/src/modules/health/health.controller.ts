import { Controller, Get } from '@nestjs/swagger';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health - پایش سلامت سیستم')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'بررسی وضعیت آنلاین بودن سرور و دیتابیس' })
  async checkHealth() {
    const memoryUsage = process.memoryUsage();
    let dbStatus = 'UP';
    let dbResponseTimeMs = 0;

    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseTimeMs = Date.now() - start;
    } catch (error) {
      dbStatus = 'DOWN';
    }

    return {
      status: dbStatus === 'UP' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        responseTimeMs: dbResponseTimeMs,
      },
      memory: {
        heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }
}