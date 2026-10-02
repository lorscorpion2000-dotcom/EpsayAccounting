import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  permissionIds!: string[];
}