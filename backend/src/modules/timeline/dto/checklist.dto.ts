import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ChecklistTypeDto {
  REBAR_BEFORE_CONCRETE = 'REBAR_BEFORE_CONCRETE',
  FORMWORK = 'FORMWORK',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  WATERPROOFING = 'WATERPROOFING',
  OTHER = 'OTHER',
}

export class ChecklistItemDto {
  @ApiProperty() title!: string;
  @ApiProperty() isChecked!: boolean;
  @ApiPropertyOptional() notes?: string;
}

export class CreateChecklistDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiProperty({ enum: ChecklistTypeDto }) @IsEnum(ChecklistTypeDto) type!: ChecklistTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsDateString() checklistDate!: string;
  @ApiProperty({ type: [ChecklistItemDto] }) @IsArray() items!: ChecklistItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() inspectorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supervisorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateChecklistDto extends CreateChecklistDto {}

export class RejectChecklistDto {
  @ApiProperty() @IsString() reason!: string;
}
