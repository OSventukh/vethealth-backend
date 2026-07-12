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
    const caller = request?.user;
    const body = request?.body;
    const targetId = body?.id;

    const callerIsAdmin =
      caller?.role?.id === RoleEnum.SuperAdmin ||
      caller?.role?.id === RoleEnum.Admin;

    if (!callerIsAdmin) {
      // If the caller is not an admin, they can only update their own user data and cannot change role or status
      if (caller?.id !== targetId) {
        throw new ForbiddenException();
      }

      if (body?.role || body?.status) {
        throw new ForbiddenException();
      }
    }

    const target = await this.usersService.findOne({ id: targetId });
    if (!target) {
      throw new NotFoundException();
    }

    // If the target user is a SuperAdmin, only another SuperAdmin can update them
    if (
      target.role.id === RoleEnum.SuperAdmin &&
      (body?.role || body?.status) &&
      caller?.role?.id !== RoleEnum.SuperAdmin
    ) {
      throw new ForbiddenException();
    }

    // If the caller is not a SuperAdmin, they cannot add the role of a SuperAdmin user to the target user
    if (
      body?.role?.id === RoleEnum.SuperAdmin &&
      caller?.role?.id !== RoleEnum.SuperAdmin
    ) {
      throw new ForbiddenException();
    }

    return true;
  }
}
