import { Module } from '@nestjs/common';
import { OverheadService } from './overhead.service';
import { OverheadController } from './overhead.controller';

@Module({
  controllers: [OverheadController],
  providers: [OverheadService],
  exports: [OverheadService],
})
export class OverheadModule {}
