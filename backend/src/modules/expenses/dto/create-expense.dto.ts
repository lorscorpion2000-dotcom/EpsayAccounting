import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength,
} from 'class-validator';
import { ExpenseCostType, ExpensePayFromType } from '@prisma/client';

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

  @ApiProperty({ enum: ExpenseCostType, default: 'COMPANY' })
  @IsOptional() @IsEnum(ExpenseCostType) costType?: ExpenseCostType;

  @ApiPropertyOptional({ description: 'شناسه کارفرما — فقط برای CLIENT_PASS_THROUGH' })
  @IsOptional() @IsUUID() clientId?: string;

  @ApiPropertyOptional({ enum: ExpensePayFromType })
  @IsOptional() @IsEnum(ExpensePayFromType) payFromType?: ExpensePayFromType;
  @ApiPropertyOptional({ description: 'برای COMPANY اجباری' })
  @IsOptional() @IsUUID() payFromAccountId?: string;

  @ApiPropertyOptional({ description: 'برای CLIENT_PASS_THROUGH اجباری نیست' })
  @IsOptional() @IsUUID() expenseAccountId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
