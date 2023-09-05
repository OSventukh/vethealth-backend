import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PaginationType } from 'src/utils/types/pagination.type';
import { PaginationOptions } from 'src/utils/types/pagination-options';
import { CreatePostDto } from './dto/create-post.dto';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { FindOptionsOrder } from 'typeorm';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postsRepository: Repository<Post>,
  ) {}

  create(createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(createPostDto);
    return this.postsRepository.save(post);
  }

  async findOne(fields: EntityCondition<Post>): Promise<Post | null> {
    const post = await this.postsRepository.findOne({ where: fields });
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }
  async findManyWithPagination(
    paginationOptions: PaginationOptions,
    fields: EntityCondition<Post>,
    order: FindOptionsOrder<Post>,
  ): Promise<PaginationType<Post>> {
    const [items, count] = await this.postsRepository.findAndCount({
      where: { ...fields },
      skip: (paginationOptions.page - 1) * paginationOptions.size,
      take: paginationOptions.size,
      order: {
        ...order,
      },
    });

    return {
      items,
      count,
      currentPage: paginationOptions.page,
      totalPages: Math.ceil(count / paginationOptions.size),
    };
  }

  update(id: Post['id'], payload: DeepPartial<Post>): Promise<Post> {
    return this.postsRepository.save(
      this.postsRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: Post['id']): Promise<void> {
    await this.postsRepository.softDelete(id);
  }
}
