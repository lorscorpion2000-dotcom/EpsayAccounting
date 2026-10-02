import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ReceiptItemDto {
  @ApiProperty() @IsUUID() itemId!: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiProperty() @IsNumber() @Min(0) unitCost!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateReceiptDto {
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() poId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() prId?: string;
  @ApiProperty() @IsDateString() receiptDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehiclePlate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [ReceiptItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiptItemDto) items!: ReceiptItemDto[];
}
