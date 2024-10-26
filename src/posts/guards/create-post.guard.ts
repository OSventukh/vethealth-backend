import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreatePostDto } from '../dto/create-post.dto';
import { PostStatusEnum } from '@/statuses/post-status.enum';
import { RoleEnum } from '@/roles/roles.enum';
import { UsersService } from '@/users/users.service';

@Injectable()
export class CreatePostGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body as CreatePostDto;

    if (!request.user?.id) {
      throw new Error('User ID is missing');
    }

    const user = await this.usersService.findOne(
      { id: request.user.id },
      {
        topics: true,
      },
    );

    const isSuperAdminOrAdmin = [RoleEnum.SuperAdmin, RoleEnum.Admin].includes(
      user.role.id as RoleEnum,
    );

    const isNotAllowedTopics =
      !isSuperAdminOrAdmin && user.topics.length > 0
        ? user.topics.some((item) => !body.topics.includes(item))
        : false;

    if (isNotAllowedTopics) {
      throw new ForbiddenException('Some topics are not allowed');
    }

    if (
      body?.status?.id === +PostStatusEnum.Published &&
      !isSuperAdminOrAdmin
    ) {
      return false;
    }
    return true;
  }
}
