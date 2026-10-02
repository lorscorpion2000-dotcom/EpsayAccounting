import { PartialType } from '@nestjs/swagger';
import { CreatePODto } from './create-po.dto';
export class UpdatePODto extends PartialType(CreatePODto) {}
