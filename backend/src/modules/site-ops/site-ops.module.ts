import { Module } from '@nestjs/common';
import { SiteOpsService } from './site-ops.service';
import { SiteOpsController } from './site-ops.controller';

@Module({
  controllers: [SiteOpsController],
  providers: [SiteOpsService],
  exports: [SiteOpsService],
})
export class SiteOpsModule {}
