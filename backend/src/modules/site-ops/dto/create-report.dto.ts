import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum WeatherEnum {
  SUNNY = 'SUNNY', CLOUDY = 'CLOUDY', RAINY = 'RAINY',
  SNOWY = 'SNOWY', WINDY = 'WINDY', STORM = 'STORM',
}

export enum AttendanceEnum {
  PRESENT = 'PRESENT', ABSENT = 'ABSENT', LEAVE = 'LEAVE',
  SICK = 'SICK', HOLIDAY = 'HOLIDAY',
}

export enum EquipmentStatusEnum {
  ACTIVE = 'ACTIVE', IDLE = 'IDLE', BROKEN = 'BROKEN', MAINTENANCE = 'MAINTENANCE',
}

export enum EntryExitKindEnum {
  PERSON = 'PERSON', VEHICLE = 'VEHICLE',
}

export enum RequestTypeEnum {
  PURCHASE = 'PURCHASE', PETTY_CASH = 'PETTY_CASH', MANPOWER = 'MANPOWER',
  TECHNICAL = 'TECHNICAL', REPAIR = 'REPAIR',
}

export enum EventTypeEnum {
  STOP = 'STOP', INCIDENT = 'INCIDENT', VISIT = 'VISIT',
  INSTRUCTION = 'INSTRUCTION', OTHER = 'OTHER',
}

// ─── Workers ───
export class WorkerDto {
  @ApiProperty() @IsString() @MaxLength(200)
  teamName: string;

  @ApiPropertyOptional({ enum: ['OWN', 'CONTRACTOR'] }) @IsOptional() @IsString()
  kind?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  contractorId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  contractorRate?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  employeeId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  foreman?: string;

  @ApiProperty() @IsNumber() @Min(0)
  workerCount: number;

  @ApiPropertyOptional({ default: 8 }) @IsOptional() @IsNumber() @Min(0)
  workHours?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  overtime?: number;

  @ApiPropertyOptional({ enum: AttendanceEnum })
  @IsOptional() @IsEnum(AttendanceEnum)
  status?: AttendanceEnum;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

// ─── Equipments ───
export class EquipmentDto {
  @ApiProperty() @IsString() @MaxLength(200)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  plateNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  operator?: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  hoursWorked?: number;

  @ApiPropertyOptional({ enum: EquipmentStatusEnum })
  @IsOptional() @IsEnum(EquipmentStatusEnum)
  status?: EquipmentStatusEnum;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  fuelLiters?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  stopReason?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  equipmentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

// ─── Materials ───
export class MaterialDto {
  @ApiProperty() @IsString() @MaxLength(300)
  itemName: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  itemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  warehouseId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiProperty() @IsNumber() @Min(0)
  quantity: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  supplier?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  vehiclePlate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  billNumber?: string;

  @ApiPropertyOptional({ description: 'IN | CONSUMPTION | OUT' })
  @IsOptional() @IsString() @MaxLength(20)
  movementType?: string;

  @ApiPropertyOptional({ description: 'ACCEPTED | CONDITIONAL | REJECTED' })
  @IsOptional() @IsString() @MaxLength(20)
  qcResult?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  exitType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  exitDest?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

// ─── Progress ───
export class ProgressDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiProperty() @IsString() @MaxLength(500)
  description: string;

  @ApiProperty() @IsNumber() @Min(0)
  progressPct: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  location?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

// ─── Entry/Exit (new) ───
export class EntryExitDto {
  @ApiProperty({ enum: EntryExitKindEnum })
  @IsEnum(EntryExitKindEnum)
  kind: EntryExitKindEnum;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  personName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  organization?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  purpose?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  vehicleType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  plateNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  driverName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  cargo?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  entryTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  exitTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

// ─── Requests (new) ───
export class RequestItemDto {
  @ApiProperty({ enum: RequestTypeEnum })
  @IsEnum(RequestTypeEnum)
  requestType: RequestTypeEnum;

  @ApiProperty() @IsString() @MaxLength(300)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  priority?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  requiredDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  amount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  pettyCashAccountId?: string;
}

// ─── Events (new) ───
export class EventDto {
  @ApiProperty({ enum: EventTypeEnum })
  @IsEnum(EventTypeEnum)
  eventType: EventTypeEnum;

  @ApiProperty() @IsString() @MaxLength(300)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  startTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  endTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  durationHrs?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)
  severity?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  actorName?: string;
}

// ═══════════════════════════════════════════════════════════
// Main DTO
// ═══════════════════════════════════════════════════════════
export class CreateDailyReportDto {
  @ApiProperty() @IsString()
  projectId: string;

  @ApiProperty({ example: '2026-10-04' }) @IsString()
  reportDate: string;

  @ApiPropertyOptional({ enum: WeatherEnum })
  @IsOptional() @IsEnum(WeatherEnum)
  weather?: WeatherEnum;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  tempMin?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  tempMax?: number;

  @ApiPropertyOptional({ example: '07:00' })
  @IsOptional() @IsString() @MaxLength(10)
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional() @IsString() @MaxLength(10)
  endTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  operations?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  issues?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  incidents?: string;

  @ApiPropertyOptional({ type: [WorkerDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkerDto)
  workers?: WorkerDto[];

  @ApiPropertyOptional({ type: [EquipmentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EquipmentDto)
  equipments?: EquipmentDto[];

  @ApiPropertyOptional({ type: [MaterialDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MaterialDto)
  materials?: MaterialDto[];

  @ApiPropertyOptional({ type: [ProgressDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProgressDto)
  progresses?: ProgressDto[];

  @ApiPropertyOptional({ type: [EntryExitDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EntryExitDto)
  entryExits?: EntryExitDto[];

  @ApiPropertyOptional({ type: [RequestItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RequestItemDto)
  requests?: RequestItemDto[];

  @ApiPropertyOptional({ type: [EventDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EventDto)
  events?: EventDto[];
}

export class UpdateDailyReportDto extends PartialType(CreateDailyReportDto) {}
