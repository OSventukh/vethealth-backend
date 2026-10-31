import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesSerializerInterceptor } from '@/modules/auth/interceptors/roles-serializer.interceptor';
import { PostEntity } from './entities/post.entity';
import { PostRevisionEntity } from './entities/post-revision.entity';
import { PostsService } from './posts.service';

/**
 * Історія змін поста. Доступ — як до редагування: автор поста або Admin+
 * (перевіряє `PostsService.assertCanMutate`); анонімів відсікає глобальний
 * `AuthDataGuard` (ендпоінти не `@Public`).
 */
@ApiTags('Posts')
@Controller('posts/:id/revisions')
@UseInterceptors(RolesSerializerInterceptor)
export class PostRevisionsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(
    @Request() request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostRevisionEntity[]> {
    return this.postsService.findRevisions(id, request.user);
  }

  @Get(':revisionId')
  @HttpCode(HttpStatus.OK)
  getOne(
    @Request() request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ): Promise<PostRevisionEntity> {
    return this.postsService.findRevision(id, revisionId, request.user);
  }

  @Post(':revisionId/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @Request() request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
  ): Promise<PostEntity> {
    return this.postsService.restoreRevision(id, revisionId, request.user);
  }
}
