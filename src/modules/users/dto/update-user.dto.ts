import { ApiProperty, PartialType } from '@nestjs/swagger';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import {
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

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
}
