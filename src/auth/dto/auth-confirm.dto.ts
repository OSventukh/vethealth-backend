import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AuthConfirmDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  confirmationToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  password: string;
}
