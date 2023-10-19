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
export class UpdateUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request?.body;
    const userId = request?.params?.id;

    const user = await this.usersService.findOne({ id: userId });

    // todo: prevent updating super admin user by other roles

    if (!user) {
      throw new NotFoundException();
    }

    if (user.role.id === RoleEnum.SuperAdmin && (body?.role || body?.status)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
