import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_RULES } from '../../../common/validators/password.validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_RULES.MAX_LENGTH)
  oldPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(PASSWORD_RULES.MIN_LENGTH)
  @MaxLength(PASSWORD_RULES.MAX_LENGTH)
  newPassword!: string;
}
