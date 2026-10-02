import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectDto {
  @ApiProperty() @IsString() reason!: string;
}
