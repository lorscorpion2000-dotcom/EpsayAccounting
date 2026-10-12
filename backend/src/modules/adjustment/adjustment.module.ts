import { Module } from '@nestjs/common';
import { AdjustmentIndexService } from './adjustment-index.service';
import { AdjustmentService } from './adjustment.service';
import { MaterialPriceDiffService } from './material-price-diff.service';
import { AdjustmentIndexController } from './adjustment-index.controller';
import { AdjustmentController } from './adjustment.controller';
import { MaterialPriceDiffController } from './material-price-diff.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [AdjustmentIndexController, AdjustmentController, MaterialPriceDiffController],
  providers: [AdjustmentIndexService, AdjustmentService, MaterialPriceDiffService],
  exports: [AdjustmentIndexService, AdjustmentService, MaterialPriceDiffService],
})
export class AdjustmentModule {}
