import { lowerCaseTransformer } from '@/users/utils/transformers/lower-case.transformer';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Validate } from 'class-validator';

export class AuthLoginDto {
  @ApiProperty({ example: 'test1@example.com' })
  @IsEmail()
  @Transform(lowerCaseTransformer)
  @Validate(IsExist, ['UserEntity'], {
    message: 'emailNotExists',
  })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
