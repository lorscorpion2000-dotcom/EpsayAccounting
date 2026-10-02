import { PartialType } from '@nestjs/swagger';
import { CreatePettyCashAccountDto } from './create-account.dto';
export class UpdatePettyCashAccountDto extends PartialType(CreatePettyCashAccountDto) {}
