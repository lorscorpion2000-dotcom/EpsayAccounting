import { PartialType } from '@nestjs/swagger';
import { CreateDailyReportDto } from './create-report.dto';
export class UpdateDailyReportDto extends PartialType(CreateDailyReportDto) {}
