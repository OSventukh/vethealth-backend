import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class AuthDataGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    _err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    return user;
  }
}
