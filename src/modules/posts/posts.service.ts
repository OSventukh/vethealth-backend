import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository, Like, Not } from 'typeorm';
import { RoleEnum } from '@/roles/roles.enum';
import type { JwtPayloadType } from '@/modules/auth/strategies/types/jwt-payload.type';
import { PostEntity } from './entities/post.entity';
import { PaginationType } from '@/utils/types/pagination.type';
import { CreatePostDto } from './dto/create-post.dto';
import { FindOptionsWhere } from 'typeorm';
import { PostQueryDto } from './dto/post-query.dto';
import { postOrder } from './utils/post-order';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatusEnum } from '@/statuses/post-status.enum';
import { FileEntity } from '@/modules/files/entities/file.entity';
import {
  PostRevisionEntity,
  PostRevisionReason,
} from './entities/post-revision.entity';
import { PostRevisionsService } from './post-revisions.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private postsRepository: Repository<PostEntity>,
    private postRevisionsService: PostRevisionsService,
  ) {}

  create(
    createPostDto: CreatePostDto,
    user?: JwtPayloadType,
  ): Promise<PostEntity> {
    return this.postsRepository.manager.transaction(async (manager) => {
      const post = await manager.save(
        PostEntity,
        manager.create(PostEntity, createPostDto),
      );
      await this.postRevisionsService.record(
        manager,
        post.id,
        user?.id ?? null,
        PostRevisionReason.Create,
      );
      return post;
    });
  }

  async findOne(
    fields: FindOptionsWhere<PostEntity>,
    include?: FindOptionsRelations<PostEntity>,
    user?: JwtPayloadType,
  ): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      where: fields,
      relations: { ...include, author: true },
    });
    if (!post) {
      throw new NotFoundException();
    }
    const isPublished = post.status.name === 'Published';
    const isAdmin =
      user?.role?.id === RoleEnum.SuperAdmin ||
      user?.role?.id === RoleEnum.Admin;
    const isOwner = !!user && user.id === post.author?.id;

    if (!isPublished && !isAdmin && !isOwner) {
      throw new NotFoundException();
    }

    return post;
  }
  async findManyWithPagination(
    queryDto: PostQueryDto,
    user?: JwtPayloadType,
  ): Promise<PaginationType<PostEntity>> {
    const {
      title,
      author,
      topic,
      category,
      status,
      include,
      page,
      size,
      orderBy,
      sort,
    } = queryDto;

    const common = {
      title: title && Like(`%${title}%`),
      author: { firstname: author },
      topics: { slug: topic },
      categories: { slug: category },
    };

    const isAdmin =
      user?.role?.id === RoleEnum.SuperAdmin ||
      user?.role?.id === RoleEnum.Admin;

    let where: FindOptionsWhere<PostEntity> | FindOptionsWhere<PostEntity>[] =
      {};

    if (isAdmin) {
      where = {
        ...common,
        status: status === 'all' ? undefined : { name: status || 'Published' },
      };
    } else if (user) {
      where = [
        { ...common, status: { name: 'Published' } },
        { ...common, author: { id: user.id } },
      ];
    } else {
      where = {
        ...common,
        status: { name: 'Published' },
      };
    }
    const [items, count] = await this.postsRepository.findAndCount({
      where,
      skip: (page - 1) * size,
      take: size,
      order: postOrder(orderBy, sort),
      relations: include,
    });

    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }

  async update(
    payload: UpdatePostDto,
    user?: JwtPayloadType,
  ): Promise<PostEntity> {
    const post = await this.assertCanMutate(payload.id, user);
    const isAdmin =
      user?.role?.id === RoleEnum.SuperAdmin ||
      user?.role?.id === RoleEnum.Admin;

    const wantsToPublish =
      Number(payload.status?.id) === Number(PostStatusEnum.Published);
    const alreadyPublished = post.status?.name === 'Published';
    if (wantsToPublish && !alreadyPublished && !isAdmin) {
      throw new ForbiddenException();
    }
    return this.postsRepository.manager.transaction(async (manager) => {
      await this.postRevisionsService.ensureBaseline(manager, post.id);
      const saved = await manager.save(
        PostEntity,
        manager.create(PostEntity, payload),
      );
      await this.postRevisionsService.record(
        manager,
        post.id,
        user?.id ?? null,
        PostRevisionReason.Update,
      );
      return saved;
    });
  }

  async findRevisions(
    postId: PostEntity['id'],
    user?: JwtPayloadType,
  ): Promise<PostRevisionEntity[]> {
    await this.assertCanMutate(postId, user);
    return this.postRevisionsService.list(postId);
  }

  async findRevision(
    postId: PostEntity['id'],
    revisionId: PostRevisionEntity['id'],
    user?: JwtPayloadType,
  ): Promise<PostRevisionEntity> {
    await this.assertCanMutate(postId, user);
    const revision = await this.postRevisionsService.findOne(
      postId,
      revisionId,
    );
    if (!revision) {
      throw new NotFoundException();
    }
    return revision;
  }

  /**
   * Повертає пост до стану ревізії: title/slug/content, SEO-мета й обкладинка.
   * Статус не чіпаємо (відкат правки не має публікувати/знімати з публікації),
   * категорії/топіки не версіонуються. Сам відкат — теж нова ревізія.
   */
  async restoreRevision(
    postId: PostEntity['id'],
    revisionId: PostRevisionEntity['id'],
    user?: JwtPayloadType,
  ): Promise<PostEntity> {
    const revision = await this.findRevision(postId, revisionId, user);

    // Унікальні індекси title/slug охоплюють і м'яко видалені пости.
    const taken = await this.postsRepository.findOne({
      where: [
        { id: Not(postId), title: revision.title },
        { id: Not(postId), slug: revision.slug },
      ],
      withDeleted: true,
      loadEagerRelations: false,
    });
    if (taken) {
      throw new ConflictException({
        statusCode: 409,
        message: `Title or slug of this revision is used by post "${taken.title}"`,
        errorCode: 'POST_REVISION_CONFLICT',
        post: { id: taken.id, title: taken.title, slug: taken.slug },
      });
    }

    await this.postsRepository.manager.transaction(async (manager) => {
      await this.postRevisionsService.ensureBaseline(manager, postId);
      const post = await manager.findOne(PostEntity, {
        where: { id: postId },
        relations: { metadata: true },
      });

      // Файл обкладинки могли видалити з медіатеки після цієї ревізії.
      const imageExists =
        !!revision.featuredImageFileId &&
        (await manager.exists(FileEntity, {
          where: { id: revision.featuredImageFileId },
        }));

      await manager.save(
        PostEntity,
        manager.create(PostEntity, {
          id: postId,
          title: revision.title,
          slug: revision.slug,
          content: revision.content,
          featuredImageFile: imageExists
            ? { id: revision.featuredImageFileId }
            : null,
          featuredImageUrl: revision.featuredImageUrl,
          // Оновлюємо наявний рядок metadata на місці (id зберігається),
          // а не створюємо новий. Ревізія без мета — мету не чіпаємо.
          ...(revision.metadata && {
            metadata: { ...post?.metadata, ...revision.metadata },
          }),
        }),
      );
      await this.postRevisionsService.record(
        manager,
        postId,
        user?.id ?? null,
        PostRevisionReason.Restore,
        revision.id,
      );
    });

    return this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true, metadata: true },
    });
  }

  async softDelete(id: PostEntity['id'], user?: JwtPayloadType): Promise<void> {
    await this.assertCanMutate(id, user);
    await this.postsRepository.softDelete(id);
  }

  private async assertCanMutate(postId: string, user?: JwtPayloadType) {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { author: true },
    });

    if (!post) {
      throw new NotFoundException();
    }

    const isAdmin =
      user?.role?.id === RoleEnum.SuperAdmin ||
      user?.role?.id === RoleEnum.Admin;
    const isOwner = !!user && user.id === post.author?.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException();
    }

    return post;
  }
}
