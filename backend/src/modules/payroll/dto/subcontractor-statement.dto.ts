import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class StatementItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsItemId?: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateSubcontractorStatementDto {
  @ApiProperty() @IsUUID() contractorId!: string;
  @ApiProperty() @IsUUID() projectId!: string;

  @ApiPropertyOptional({ description: 'شناسه قرارداد حقوقی (پرسنل/پیمانکار)' })
  @IsOptional() @IsUUID() contractId?: string;
  @ApiProperty() @IsInt() @Min(1) statementNumber!: number;
  @ApiProperty() @IsDateString() periodStart!: string;
  @ApiProperty() @IsDateString() periodEnd!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prepaymentPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prepaymentAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) prepaymentDepreciation?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) insurancePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) retentionPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) otherDeduction?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ type: [StatementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatementItemDto)
  items!: StatementItemDto[];
}
