import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreatePayrollPeriodDto {
  @ApiProperty({ example: 1404 }) @IsInt() @Min(1300) @Max(1500) year!: number;
  @ApiProperty({ example: 7 }) @IsInt() @Min(1) @Max(12) month!: number;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}
