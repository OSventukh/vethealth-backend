import { ApiProperty, PartialType } from '@nestjs/swagger';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateIf,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { PASSWORD_REGEX } from '@/auth/constants/password-regex';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsOptional()
  @ValidateIf((o) => o.status)
  @IsObject()
  @Validate(IsExist, ['UserStatusEntity', 'id'], {
    message: ERROR_MESSAGE.STATUS_IS_NOT_VALID,
  })
  status?: UserStatusEntity;

  @IsString()
  id: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: ERROR_MESSAGE.PASSWORD_IS_NOT_MATCH,
  })
  password: string;
}
