import { RoleEnum } from '@/roles/roles.enum';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class GetTopicsGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const { user, query } = context.switchToHttp().getRequest();
    if (
      query?.status === 'inactive' &&
      (user?.role?.id !== RoleEnum.SuperAdmin ||
        user?.role?.id !== RoleEnum.Admin)
    ) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
