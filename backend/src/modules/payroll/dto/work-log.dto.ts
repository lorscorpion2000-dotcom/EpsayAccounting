import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AttendanceStatusDto2 } from './attendance.dto';

export class CreateWorkLogDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsDateString() workDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) regularHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) holidayHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: AttendanceStatusDto2 }) @IsOptional() @IsEnum(AttendanceStatusDto2) status?: AttendanceStatusDto2;
}
