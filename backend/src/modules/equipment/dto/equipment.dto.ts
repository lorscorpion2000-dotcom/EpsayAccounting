import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────
// Enums (mirror Prisma enums for validation)
// ─────────────────────────────────────────────
export enum EquipmentOwnershipEnum {
  OWNED = 'OWNED',
  RENTED = 'RENTED',
}

export enum EquipmentStatusEnum {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  BROKEN = 'BROKEN',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum MaintenanceTypeEnum {
  PREVENTIVE = 'PREVENTIVE',
  REPAIR = 'REPAIR',
  OVERHAUL = 'OVERHAUL',
  TIRE = 'TIRE',
  OTHER = 'OTHER',
}

export enum EquipmentLogStatusEnum {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  POSTED = 'POSTED',
}

// ═════════════════════════════════════════════
// Equipment (شناسنامه)
// ═════════════════════════════════════════════
export class CreateEquipmentDto {
  @ApiProperty({ example: 'لودر 470' })
  @IsString() @MaxLength(200)
  declare name: string;

  @ApiPropertyOptional({ enum: EquipmentOwnershipEnum })
  @IsOptional() @IsEnum(EquipmentOwnershipEnum)
  ownership?: EquipmentOwnershipEnum;

  @ApiPropertyOptional({ example: 'راه‌سازی' })
  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'کوماتسو' })
  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'WA470' })
  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 1403 })
  @IsOptional() @IsInt() @Min(1300)
  year?: number;

  @ApiPropertyOptional({ example: 'ایران ۱۲۳۴۵' })
  @IsOptional() @IsString() @MaxLength(32)
  plateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(64)
  serialNumber?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional() @IsNumber() @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 40000000 })
  @IsOptional() @IsNumber() @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  monthlyRate?: number;

  @ApiPropertyOptional({ example: 'گازوئیل' })
  @IsOptional() @IsString() @MaxLength(32)
  fuelType?: string;

  @ApiPropertyOptional({ example: 18.5 })
  @IsOptional() @IsNumber() @Min(0)
  fuelNormPerHour?: number;

  @ApiPropertyOptional({ description: 'UUID مالک (اگر اجاره‌ای)' })
  @IsOptional() @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'UUID پروژه فعلی' })
  @IsOptional() @IsString()
  currentProjectId?: string;

  @ApiPropertyOptional({ enum: EquipmentStatusEnum })
  @IsOptional() @IsEnum(EquipmentStatusEnum)
  status?: EquipmentStatusEnum;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}

export class UpdateEquipmentDto extends CreateEquipmentDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  declare name: string;
}

// ═════════════════════════════════════════════
// Daily Log (کارکرد روزانه)
// ═══════════════════════════════════════════──
export class CreateDailyLogDto {
  @ApiProperty() @IsString()
  declare equipmentId: string;

  @ApiProperty() @IsString()
  declare projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  wbsItemId?: string;

  @ApiProperty({ example: '2026-10-04' })
  @IsString()
  declare logDate: string;

  @ApiPropertyOptional({ example: 'صبح' })
  @IsOptional() @IsString() @MaxLength(16)
  shift?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  startMeter?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  endMeter?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  workHours?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  idleHours?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  stopHours?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  breakdownHours?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  fuelLiters?: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0)
  fuelCost?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  operatorId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300)
  workLocation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  stopReason?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class UpdateDailyLogDto extends CreateDailyLogDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  declare equipmentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString()
  declare projectId: string;
  @ApiPropertyOptional() @IsOptional() @IsString()
  declare logDate: string;
}

// ═════════════════════════════════════════════
// Maintenance (سوخت و تعمیرات)
// ═════════════════════════════════════════════
export class CreateMaintenanceDto {
  @ApiProperty() @IsString()
  declare equipmentId: string;

  @ApiProperty({ enum: MaintenanceTypeEnum })
  @IsEnum(MaintenanceTypeEnum)
  declare type: MaintenanceTypeEnum;

  @ApiProperty({ example: '2026-10-04' })
  @IsString()
  declare maintenanceDate: string;

  @ApiProperty({ example: 'سرویس دوره‌ای ۲۵۰ ساعت' })
  @IsString() @MaxLength(500)
  declare description: string;

  @ApiProperty({ example: 15000000 })
  @IsNumber() @Min(0)
  declare cost: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  parts?: any;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  vendor?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  invoiceNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  projectId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  nextServiceDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  nextServiceHours?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}