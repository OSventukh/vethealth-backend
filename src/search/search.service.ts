import { postOrder } from '@/pages/utils/page-order';
import { PostEntity } from '@/posts/entities/post.entity';
import { PaginationType } from '@/utils/types/pagination.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(PostEntity)
    private postsRepository: Repository<PostEntity>,
  ) {}

  async findManyWithPagination(
    queryDto: SearchQueryDto,
  ): Promise<PaginationType<PostEntity>> {
    const { searchQuery, page, size } = queryDto;
    const [items, count] = await this.postsRepository.findAndCount({
      where: {
        title: searchQuery && Like(`%${searchQuery}%`),
        content: searchQuery && Like(`%${searchQuery}%`),
        status: { name: 'Published' },
      },
      skip: (page - 1) * size,
      take: size,
    });

    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }
}
