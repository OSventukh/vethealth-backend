import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  status?: UserStatusEntity;
}
