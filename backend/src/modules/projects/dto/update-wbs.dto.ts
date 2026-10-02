import { PartialType } from '@nestjs/swagger';
import { CreateWbsDto } from './create-wbs.dto';

export class UpdateWbsDto extends PartialType(CreateWbsDto) {}
