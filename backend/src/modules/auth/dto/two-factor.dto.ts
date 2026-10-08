import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}

export class TwoFactorDisableDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class TwoFactorVerifyLoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  totpToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code!: string;
}
