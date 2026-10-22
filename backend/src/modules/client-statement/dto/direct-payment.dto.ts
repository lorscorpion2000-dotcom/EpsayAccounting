import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegisterDirectPaymentDto {
  @ApiProperty({ description: 'شناسه کارفرما' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ description: 'شناسه شخص یا تامین‌کننده دریافت‌کننده وجه' })
  @IsUUID()
  personOrSupplierId!: string;

  @ApiProperty({ description: 'شناسه پروژه' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'مبلغ واریز مستقیم کارفرما (ریال)' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: 'تاریخ واریز' })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({ description: 'شماره فیش یا پیگیری' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsOptional()
  @IsString()
  notes?: string;
}
