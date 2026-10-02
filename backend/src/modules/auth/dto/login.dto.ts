import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'Admin@1404' })
  @IsString()
  @MinLength(4)
  password!: string;
}