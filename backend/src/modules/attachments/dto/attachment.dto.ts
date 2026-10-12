import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AttachmentFileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimetype?: string;
}

export class CreateAttachmentBatchDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  entityType!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  entityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: [AttachmentFileDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttachmentFileDto)
  files!: AttachmentFileDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uploadedById?: string;
}
