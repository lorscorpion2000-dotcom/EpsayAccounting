import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateShareDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsUUID() partnerId!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) sharePercent!: number;
  @ApiProperty() @IsDateString() effectiveFrom!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateShareDto extends CreateShareDto {}
