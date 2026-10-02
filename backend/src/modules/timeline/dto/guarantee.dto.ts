import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum GuaranteeTypeDto {
  BANK_GUARANTEE = 'BANK_GUARANTEE',
  CHECK = 'CHECK',
  DEPOSIT = 'DEPOSIT',
  OTHER = 'OTHER',
}

export class CreateGuaranteeDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ enum: GuaranteeTypeDto }) @IsEnum(GuaranteeTypeDto) type!: GuaranteeTypeDto;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issuer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() beneficiary?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateGuaranteeDto extends CreateGuaranteeDto {}
