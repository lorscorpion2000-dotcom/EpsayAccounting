import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum LeaveTypeDto {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  UNPAID = 'UNPAID',
  MATERNITY = 'MATERNITY',
  MARRIAGE = 'MARRIAGE',
  BEREAVEMENT = 'BEREAVEMENT',
  HAJJ = 'HAJJ',
}

export class CreateLeaveRequestDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty({ enum: LeaveTypeDto }) @IsEnum(LeaveTypeDto) leaveType!: LeaveTypeDto;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
  @ApiProperty() @IsNumber() @Min(0.5) days!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
