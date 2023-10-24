import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreatePostDto } from '../dto/create-post.dto';
import { PostStatusEnum } from '@/statuses/post-status.enum';

@Injectable()
export class CreatePostGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body as CreatePostDto;

    // todo: add role checking
    // todo add topics checking
    // todo: allow super admin and maybe admin to choose 'published' status

    if (body?.status?.id === +PostStatusEnum.Published) {
      return false;
    }
    return true;
  }
}
