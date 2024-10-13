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
    const { query, page, size } = queryDto;
    const [items, count] = await this.postsRepository.findAndCount({
      where: [
        { title: query && Like(`%${query}%`), status: { name: 'Published' } },
        { content: query && Like(`%${query}%`), status: { name: 'Published' } },
      ],
      skip: (page - 1) * size,
      take: size,
    });

    const filteredItems = items.filter(item => {
      const content = JSON.parse(item.content);
      const textContent = this.extractTextFromJson(content);
      return textContent.includes(query);
    });

    return {
      items: filteredItems,
      count: filteredItems.length,
      currentPage: page,
      totalPages: Math.ceil(filteredItems.length / size),
    };
  }

  private extractTextFromJson(json: any): string {
    let text = '';

    const traverse = (node: any) => {
      
      if (Array.isArray(node)) {
        node.forEach(child => traverse(child));
      } else if (typeof node === 'object' && node !== null) {
        if (node.type === 'text' && node.text) {
          text += node.text + ' ';
        }
        Object.values(node).forEach(value => traverse(value));
      }
    };

    traverse(json);
    return text.trim();
  }
}