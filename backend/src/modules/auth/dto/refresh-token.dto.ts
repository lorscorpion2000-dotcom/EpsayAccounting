import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token صادرشده در login' })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
