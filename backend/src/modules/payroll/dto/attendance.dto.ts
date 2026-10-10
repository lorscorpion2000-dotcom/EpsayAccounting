import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum AttendanceStatusDto2 {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LEAVE = 'LEAVE',
  SICK = 'SICK',
  MISSION = 'MISSION',
  HOLIDAY = 'HOLIDAY',
}

export class CreateAttendanceDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsDateString() attendanceDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) workHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @ApiPropertyOptional({ enum: AttendanceStatusDto2 }) @IsOptional() @IsEnum(AttendanceStatusDto2) status?: AttendanceStatusDto2;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════
// DTO های گرید ماهانه حضور و غیاب
// ═══════════════════════════════════════════════════════════
export class GridQueryDto {
  @ApiProperty() @IsNumber() year!: number;
  @ApiProperty() @IsNumber() month!: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}

export class BulkAttendanceItemDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsDateString() attendanceDate!: string;
  @ApiPropertyOptional({ enum: AttendanceStatusDto2 })
  @IsOptional() @IsEnum(AttendanceStatusDto2) status?: AttendanceStatusDto2;
  @ApiPropertyOptional() @IsOptional() @IsString() checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) workHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class BulkAttendanceDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ type: [BulkAttendanceItemDto] }) items!: BulkAttendanceItemDto[];
}
