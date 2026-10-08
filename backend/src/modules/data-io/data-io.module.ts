import { Module } from '@nestjs/common';
import { DataIoService } from './data-io.service';
import { DataIoController } from './data-io.controller';

@Module({
  controllers: [DataIoController],
  providers: [DataIoService],
  exports: [DataIoService],
})
export class DataIoModule {}
