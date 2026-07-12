import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository, Like } from 'typeorm';
import { RoleEnum } from '@/roles/roles.enum';
import type { JwtPayloadType } from '@/modules/auth/strategies/types/jwt-payload.type';
import { PostEntity } from './entities/post.entity';
import { PaginationType } from 'src/utils/types/pagination.type';
import { CreatePostDto } from './dto/create-post.dto';
import { FindOptionsWhere } from 'typeorm';
import { PostQueryDto } from './dto/post-query.dto';
import { postOrder } from './utils/post-order';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatusEnum } from '@/statuses/post-status.enum';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private postsRepository: Repository<PostEntity>,
  ) {}

  create(createPostDto: CreatePostDto): Promise<PostEntity> {
    const post = this.postsRepository.create(createPostDto);
    return this.postsRepository.save(post);
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
    return this.postsRepository.save(this.postsRepository.create(payload));
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
