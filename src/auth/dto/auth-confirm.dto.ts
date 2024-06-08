import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { IsEqualTo } from '@/utils/validators/is-equal.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Validate } from 'class-validator';

const passwordRegex =
  /^(?=.*[a-zа-щьюяїієґ])(?=.*[A-ZА-ЩЬЮЯЇІЄҐ])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`])[a-zA-Zа-щьюяїієґА-ЩЬЮЯЇІЄҐ\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`]{8,20}$/;

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
  @Matches(passwordRegex, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(passwordRegex, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  @IsEqualTo('password', {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_EQUAL,
  })
  confirmPassword: string;
}
