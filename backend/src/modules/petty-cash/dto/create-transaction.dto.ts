import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export enum PettyCashTxTypeDto {
  FUNDING = 'FUNDING',
  EXPENSE = 'EXPENSE',
  SETTLEMENT = 'SETTLEMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreatePettyCashTransactionDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiProperty({ enum: PettyCashTxTypeDto })
  @IsEnum(PettyCashTxTypeDto)
  type!: PettyCashTxTypeDto;

  @ApiProperty()
  @IsDateString()
  txDate!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wbsItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'حساب بانکی/نقدی مبدأ برای FUNDING' })
  @IsOptional()
  @IsUUID()
  sourceAccountId?: string;

  @ApiPropertyOptional({ description: 'آیا هزینه قابل مطالبه از کارفرما است؟' })
  @IsOptional()
  @IsBoolean()
  isReimbursable?: boolean;

  @ApiPropertyOptional({ description: 'درصد ضریب/مدیریت پیمان' })
  @IsOptional()
  @IsNumber()
  markupPercent?: number;
}