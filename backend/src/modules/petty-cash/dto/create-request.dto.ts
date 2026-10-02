import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePettyCashRequestDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiProperty()
  @IsDateString()
  requestDate!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsNumber()
  currentBalance!: number;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iban?: string;
}
