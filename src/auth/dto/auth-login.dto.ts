import { IsEmail, IsNotEmpty, IsString, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class AuthLoginDto {
  @ApiProperty({ example: 'test1@example.com' })
  @IsEmail()
  @Transform(lowerCaseTransformer)
  @Validate(IsExist, ['UserEntity'], {
    message: ERROR_MESSAGE.EMAIL_NOT_EXIST,
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}
