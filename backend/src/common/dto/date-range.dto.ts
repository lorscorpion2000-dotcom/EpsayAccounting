import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'From date (string, format per service)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date (string, format per service)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  toDate?: string;
}
