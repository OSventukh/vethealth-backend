import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsEqualTo } from '@/utils/validators/is-equal.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Validate } from 'class-validator';
import { PASSWORD_REGEX } from '../constants/password-regex';

export class AuthConfirmDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Validate(IsExist, ['ConfirmEntity'], {
    message: ERROR_MESSAGE.CONFIRMATION_TOKEN_IS_NOT_EXIST,
  })
  hash: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  @IsEqualTo('password', {
    message: i18nValidationMessage('errors.matchPassword'),
  })
  confirmPassword: string;
}
