import { IsString, IsOptional, IsNumber, IsIn, IsUUID, MaxLength } from 'class-validator';

export class CreateChequeDto {
  @IsIn(['ISSUED', 'RECEIVED']) direction!: 'ISSUED' | 'RECEIVED';

  @IsString() @MaxLength(64) serial!: string;
  @IsNumber() amount!: number;
  @IsString() issueDate!: string; // ISO date
  @IsString() dueDate!: string;

  @IsOptional() @IsString() @MaxLength(500) description?: string;

  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsUUID() partnerId?: string;
  @IsOptional() @IsUUID() projectId?: string;
}