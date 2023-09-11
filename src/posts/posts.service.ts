import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { PaginationType } from 'src/utils/types/pagination.type';
import { PaginationOptions } from 'src/utils/types/pagination-options.type';
import { CreatePostDto } from './dto/create-post.dto';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

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

  async findOne(fields: FindOptionsWhere<PostEntity>): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({ where: fields });
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }
  async findManyWithPagination(
    paginationOptions: PaginationOptions,
    fields: FindOptionsWhere<PostEntity>,
    order: FindOptionsOrder<PostEntity>,
  ): Promise<PaginationType<PostEntity>> {
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

  update(
    id: PostEntity['id'],
    payload: DeepPartial<PostEntity>,
  ): Promise<PostEntity> {
    return this.postsRepository.save(
      this.postsRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: PostEntity['id']): Promise<void> {
    await this.postsRepository.softDelete(id);
  }
}
