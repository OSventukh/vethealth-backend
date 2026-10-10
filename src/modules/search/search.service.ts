import { PostEntity } from '@/modules/posts/entities/post.entity';
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
    const { page, size } = queryDto;
    const query = queryDto.query?.trim();

    // Без запиту умова `Like` випала б із where, і ми б перебрали всі
    // опубліковані пости — порожній пошук просто нічого не знаходить.
    if (!query) {
      return { items: [], count: 0, currentPage: page, totalPages: 0 };
    }

    const [items, _count] = await this.postsRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), status: { name: 'Published' } },
        { content: Like(`%${query}%`), status: { name: 'Published' } },
      ],
      skip: (page - 1) * size,
      take: size,
      relations: ['topics'],
    });

    // SQL-`Like` по content влучає і в службові поля Lexical-JSON, тож
    // збіги в контенті перевіряємо по видимому тексту. Збіг у заголовку
    // зараховуємо одразу — інакше такі пости відсікалися б.
    const needle = query.toLowerCase();
    const filteredItems = items.filter((item) => {
      if (item.title?.toLowerCase().includes(needle)) {
        return true;
      }
      const content = JSON.parse(item.content);
      const textContent = this.extractTextFromJson(content);
      return textContent.toLowerCase().includes(needle);
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
        node.forEach((child) => {
          traverse(child);
        });
      } else if (typeof node === 'object' && node !== null) {
        if (node.type === 'text' && node.text) {
          text += `${node.text} `;
        }
        Object.values(node).forEach((value) => {
          traverse(value);
        });
      }
    };

    traverse(json);
    return text.trim();
  }
}
