import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReasonDto {
  @ApiPropertyOptional({ description: 'Reason for the action' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReasonForceDto extends ReasonDto {
  @ApiPropertyOptional({ description: 'Force the action' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
