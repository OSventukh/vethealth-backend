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

    // Екрануємо wildcard'и LIKE: запит `%` чи `_` інакше збігався б із
    // кожним постом. Фінальну перевірку однаково робить JS-фільтр нижче.
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;

    // Пагінуємо ПІСЛЯ фільтра по видимому тексту: SQL `skip/take` до нього
    // давав би неповні сторінки й хибні count/totalPages. Кандидатів небагато
    // — лише опубліковані пости, що збіглися з LIKE.
    const candidates = await this.postsRepository.find({
      where: [
        { title: Like(pattern), status: { name: 'Published' } },
        { content: Like(pattern), status: { name: 'Published' } },
      ],
      order: { createdAt: 'DESC' },
      relations: ['topics'],
    });

    // SQL-`Like` по content влучає і в службові поля Lexical-JSON, тож
    // збіги в контенті перевіряємо по видимому тексту. Збіг у заголовку
    // зараховуємо одразу — інакше такі пости відсікалися б.
    const needle = query.toLowerCase();
    const matches = candidates.filter(
      (item) =>
        item.title?.toLowerCase().includes(needle) ||
        this.visibleText(item.content).toLowerCase().includes(needle),
    );

    return {
      items: matches.slice((page - 1) * size, page * size),
      count: matches.length,
      currentPage: page,
      totalPages: Math.ceil(matches.length / size),
    };
  }

  // Один пост із не-JSON контентом (порожній рядок, легасі-текст) не має
  // валити весь публічний пошук — такий контент і є видимим текстом.
  private visibleText(content: string | null): string {
    if (!content) {
      return '';
    }
    try {
      return this.extractTextFromJson(JSON.parse(content));
    } catch {
      return content;
    }
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
