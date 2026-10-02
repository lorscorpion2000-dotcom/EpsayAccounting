import { PartialType } from '@nestjs/swagger';
import { CreatePRDto } from './create-pr.dto';
export class UpdatePRDto extends PartialType(CreatePRDto) {}
