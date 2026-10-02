import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum PartnerTypeDto {
  CLIENT = 'CLIENT',
  CONSULTANT = 'CONSULTANT',
  CONTRACTOR = 'CONTRACTOR',
  SUPPLIER = 'SUPPLIER',
  EMPLOYEE = 'EMPLOYEE',
  PARTNER = 'PARTNER',
  OTHER = 'OTHER',
}

export class CreatePartnerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: PartnerTypeDto })
  @IsOptional()
  @IsEnum(PartnerTypeDto)
  type?: PartnerTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}
