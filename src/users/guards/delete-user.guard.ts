import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class DeleteUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.params?.id;
    const user = await this.usersService.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException();
    }

    if (user.role.id === RoleEnum.SuperAdmin) {
      throw new ForbiddenException();
    }

    return true;
  }
}
