import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class WorkerStatementItemDto {
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contractItemId?: string;
}

export class CreateWorkerStatementDto {
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty() @IsInt() @Min(1) @Type(() => Number) statementNumber!: number;
  @ApiProperty() @IsDateString() periodStart!: string;
  @ApiProperty() @IsDateString() periodEnd!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) insurancePercent?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ type: [WorkerStatementItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkerStatementItemDto)
  items!: WorkerStatementItemDto[];
}

export class PreviewWorkerStatementDto {
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiProperty() @IsDateString() periodStart!: string;
  @ApiProperty() @IsDateString() periodEnd!: string;
}
