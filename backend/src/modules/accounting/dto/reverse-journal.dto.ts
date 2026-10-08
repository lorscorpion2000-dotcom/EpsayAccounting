import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class ReverseJournalDto {
  @ApiProperty({ description: 'Reason for reversal' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ description: 'Reversal date (ISO). Defaults to today.' })
  @IsOptional()
  @IsDateString()
  reversalDate?: string;
}