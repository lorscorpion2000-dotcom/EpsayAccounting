import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';

export class RFQResponseItemDto {
  @ApiProperty()
  @IsUUID()
  prItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRFQResponseDto {
  @ApiProperty()
  @IsUUID()
  rfqId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ type: [RFQResponseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RFQResponseItemDto)
  items!: RFQResponseItemDto[];
}
