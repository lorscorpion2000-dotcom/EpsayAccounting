import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvCountItemDto {
  @ApiProperty() @IsString()
  itemId: string;

  @ApiProperty({ example: 10 }) @IsNumber()
  physicalQty: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class CreateInvCountDto {
  @ApiProperty() @IsString()
  warehouseId: string;

  @ApiProperty({ example: '2026-10-04' }) @IsString()
  countDate: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: [InvCountItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InvCountItemDto)
  items?: InvCountItemDto[];
}

export class UpdateInvCountDto extends PartialType(CreateInvCountDto) {}

export class SetItemsDto {
  @ApiProperty({ type: [InvCountItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvCountItemDto)
  items: InvCountItemDto[];
}

// ═══ Transfer ═══
export class TransferItemDto {
  @ApiProperty() @IsString()
  itemId: string;

  @ApiProperty({ example: 5 }) @IsNumber() @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class CreateTransferDto {
  @ApiProperty() @IsString()
  fromWarehouseId: string;

  @ApiProperty() @IsString()
  toWarehouseId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  projectId?: string;

  @ApiProperty({ example: '2026-10-04' }) @IsString()
  transferDate: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  driverName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32)
  vehiclePlate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ type: [TransferItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TransferItemDto)
  items?: TransferItemDto[];
}

export class UpdateTransferDto extends PartialType(CreateTransferDto) {}
