import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '../constants/password-regex';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class AuthChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  password: string;

  @IsString()
  id: string;
}
