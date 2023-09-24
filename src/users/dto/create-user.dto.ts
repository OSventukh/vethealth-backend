import { IsEmail, IsNotEmpty, IsOptional, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  lastname?: string | null;

  @ApiProperty({ example: 'test@test.com' })
  @Validate(IsNotExist, ['UserEntity'], {
    message: ERROR_MESSAGE.EMAIL_ALREADY_EXIST,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
