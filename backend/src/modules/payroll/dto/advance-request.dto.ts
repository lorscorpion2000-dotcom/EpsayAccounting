import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAdvanceRequestDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty() @IsDateString() requestDate!: string;
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
