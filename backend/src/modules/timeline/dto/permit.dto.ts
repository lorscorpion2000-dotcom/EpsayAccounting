import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum PermitTypeDto {
  DEMOLITION = 'DEMOLITION',
  CONSTRUCTION = 'CONSTRUCTION',
  NO_VIOLATION = 'NO_VIOLATION',
  COMPLETION = 'COMPLETION',
  OTHER = 'OTHER',
}

export enum PermitStatusDto {
  PENDING = 'PENDING',
  ISSUED = 'ISSUED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export class CreatePermitDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ enum: PermitTypeDto }) @IsEnum(PermitTypeDto) type!: PermitTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() authority?: string;
  @ApiPropertyOptional({ enum: PermitStatusDto }) @IsOptional() @IsEnum(PermitStatusDto) status?: PermitStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePermitDto extends CreatePermitDto {}
