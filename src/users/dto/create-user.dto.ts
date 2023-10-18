import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Validate,
  ValidateIf,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { RoleEntity } from '@/roles/entities/role.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { UserStatusEnum } from '@/statuses/user-statuses.enum';
import { IsNotSuperAdmin } from '../utils/validators/is-not-admin.validator';

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

  @ApiProperty()
  @Validate(IsExist, ['RoleEntity', 'id'], {
    message: ERROR_MESSAGE.ROLE_IS_NOT_VALID,
  })
  @IsNotEmpty()
  @IsObject()
  @Validate(IsNotSuperAdmin, {
    message: ERROR_MESSAGE.SUPERADMIN_IS_NOT_ALLOWED,
  })
  role: RoleEntity;

  @ApiProperty()
  @ValidateIf((o) => o.status)
  @IsObject()
  @Validate(IsExist, ['UserStatusEntity', 'id'], {
    message: ERROR_MESSAGE.STATUS_IS_NOT_VALID,
  })
  status: UserStatusEntity = { id: UserStatusEnum.Pending } as UserStatusEntity;

  @ApiProperty({ example: [{ id: '55de06e1-0384-4f6f-b118-eb3dd529af1e' }] })
  @IsOptional()
  @IsArray()
  @Validate(IsExist, ['TopicEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.TOPIC_IS_NOT_VALID,
  })
  topics?: TopicEntity[] | null;
}
