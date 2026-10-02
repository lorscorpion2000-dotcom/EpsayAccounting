import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DocumentTypeDto {
  ARCHITECTURE = 'ARCHITECTURE',
  STRUCTURE = 'STRUCTURE',
  MEP = 'MEP',
  SITE_PLAN = 'SITE_PLAN',
  OTHER = 'OTHER',
}

export enum DocumentPhaseDto {
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ enum: DocumentTypeDto }) @IsEnum(DocumentTypeDto) type!: DocumentTypeDto;
  @ApiProperty({ enum: DocumentPhaseDto }) @IsEnum(DocumentPhaseDto) phase!: DocumentPhaseDto;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() version!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() approvedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateDocumentDto extends CreateDocumentDto {}
