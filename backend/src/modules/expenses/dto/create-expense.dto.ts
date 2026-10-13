import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength,
} from 'class-validator';
import { ExpensePayFromType } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty() @IsDateString() expenseDate!: string;

  @ApiProperty() @IsUUID() categoryId!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() costCenterId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;

  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;

  @ApiProperty() @IsString() @MaxLength(500) description!: string;

  @ApiProperty({ enum: ExpensePayFromType }) @IsEnum(ExpensePayFromType) payFromType!: ExpensePayFromType;
  @ApiProperty() @IsUUID() payFromAccountId!: string;

  @ApiProperty() @IsUUID() expenseAccountId!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
