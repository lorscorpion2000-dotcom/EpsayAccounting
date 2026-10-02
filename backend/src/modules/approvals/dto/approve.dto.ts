import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApproveDto {
  @ApiProperty({ description: 'ماژول مربوطه', example: 'petty-cash-transaction' })
  @IsString()
  module!: string;

  @ApiProperty({ description: 'شناسه آیتم' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'یادداشت اختیاری' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectDto {
  @ApiProperty({ description: 'ماژول مربوطه' })
  @IsString()
  module!: string;

  @ApiProperty({ description: 'شناسه آیتم' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'دلیل رد — الزامی' })
  @IsString()
  reason!: string;
}
