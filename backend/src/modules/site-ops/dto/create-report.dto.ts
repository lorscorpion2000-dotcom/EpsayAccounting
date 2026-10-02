import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export enum WeatherConditionDto { SUNNY='SUNNY', CLOUDY='CLOUDY', RAINY='RAINY', SNOWY='SNOWY', WINDY='WINDY', STORM='STORM' }
export enum AttendanceStatusDto { PRESENT='PRESENT', ABSENT='ABSENT', LEAVE='LEAVE', SICK='SICK', HOLIDAY='HOLIDAY' }
export enum EquipmentStatusDto { ACTIVE='ACTIVE', IDLE='IDLE', BROKEN='BROKEN', MAINTENANCE='MAINTENANCE' }

export class WorkerDto {
  @ApiProperty() @IsString() teamName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() foreman?: string;
  @ApiProperty() @IsInt() @Min(0) workerCount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() workHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() overtime?: number;
  @ApiPropertyOptional({ enum: AttendanceStatusDto }) @IsOptional() @IsEnum(AttendanceStatusDto) status?: AttendanceStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class EquipmentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plateNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() hoursWorked?: number;
  @ApiPropertyOptional({ enum: EquipmentStatusDto }) @IsOptional() @IsEnum(EquipmentStatusDto) status?: EquipmentStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class MaterialDto {
  @ApiProperty() @IsString() itemName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehiclePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class ProgressDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsNumber() @Min(0) progressPct!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateDailyReportDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsDateString() reportDate!: string;
  @ApiPropertyOptional({ enum: WeatherConditionDto }) @IsOptional() @IsEnum(WeatherConditionDto) weather?: WeatherConditionDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() tempMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() tempMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() operations?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issues?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidents?: string;

  @ApiPropertyOptional({ type: [WorkerDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkerDto) workers?: WorkerDto[];
  @ApiPropertyOptional({ type: [EquipmentDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EquipmentDto) equipments?: EquipmentDto[];
  @ApiPropertyOptional({ type: [MaterialDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MaterialDto) materials?: MaterialDto[];
  @ApiPropertyOptional({ type: [ProgressDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProgressDto) progresses?: ProgressDto[];
}
