import { IsOptional, IsString, IsNumber, IsUUID, MaxLength } from 'class-validator';

export class UpdateChequeDto {
  @IsOptional() @IsString() @MaxLength(64) serial?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsUUID() partnerId?: string;
  @IsOptional() @IsUUID() projectId?: string;
}