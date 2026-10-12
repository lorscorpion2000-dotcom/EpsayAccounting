import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

export class ImportRowsDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  rows!: unknown[];
}
