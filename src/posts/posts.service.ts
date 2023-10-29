import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsRelations, Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { PaginationType } from 'src/utils/types/pagination.type';
import { CreatePostDto } from './dto/create-post.dto';
import { FindOptionsWhere } from 'typeorm';
import { PostQueryDto } from './dto/post-query.dto';
import { postOrder } from './utils/post-order';

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
  ): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      where: fields,
      relations: include,
    });
    if (!post) {
      throw new NotFoundException();
    }
    return post;
  }
  async findManyWithPagination(
    queryDto: PostQueryDto,
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
    const [items, count] = await this.postsRepository.findAndCount({
      where: {
        title,
        status: {
          name: status,
        },
        author: {
          firstname: author,
        },
        topics: {
          slug: topic,
        },
        categories: {
          slug: category,
        },
      },
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

  update(payload: DeepPartial<PostEntity>): Promise<PostEntity> {
    return this.postsRepository.save(this.postsRepository.create(payload));
  }

  async softDelete(id: PostEntity['id']): Promise<void> {
    await this.postsRepository.softDelete(id);
  }
}
