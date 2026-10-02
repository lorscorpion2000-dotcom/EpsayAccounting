import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;

  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty() @IsDateString() withdrawalDate!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() targetProjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() transferToContribution?: boolean;
}

export class UpdateWithdrawalDto extends CreateWithdrawalDto {}
