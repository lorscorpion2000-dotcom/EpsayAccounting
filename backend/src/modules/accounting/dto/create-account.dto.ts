import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

export enum AccountLevelDto { GROUP = 'GROUP', GENERAL = 'GENERAL', SUBSIDIARY = 'SUBSIDIARY', DETAIL = 'DETAIL' }
export enum AccountNatureDto { DEBIT = 'DEBIT', CREDIT = 'CREDIT' }

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AccountLevelDto })
  @IsEnum(AccountLevelDto)
  level!: AccountLevelDto;

  @ApiProperty({ enum: AccountNatureDto })
  @IsEnum(AccountNatureDto)
  nature!: AccountNatureDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  detailId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPostable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
