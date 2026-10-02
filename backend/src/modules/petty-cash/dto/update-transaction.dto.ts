import { PartialType } from '@nestjs/swagger';
import { CreatePettyCashTransactionDto } from './create-transaction.dto';
export class UpdatePettyCashTransactionDto extends PartialType(CreatePettyCashTransactionDto) {}
