import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PostEntity } from '@/modules/posts/entities/post.entity';

const lexical = (text: string) =>
  JSON.stringify({
    root: { children: [{ children: [{ type: 'text', text }] }] },
  });

const post = (id: number, title: string, text: string) =>
  ({ id, title, content: lexical(text) }) as unknown as PostEntity;

const queryDto = (query?: string, page = 1, size = 10) =>
  Object.assign(new SearchQueryDto(), { query, page, size });

describe('SearchService', () => {
  let module: TestingModule;
  let searchService: SearchService;
  let postsRepository: Repository<PostEntity>;
  const POST_REPOSITORY_TOKEN = getRepositoryToken(PostEntity);

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: POST_REPOSITORY_TOKEN,
          useValue: createMock<Repository<PostEntity>>(),
        },
      ],
    }).compile();

    searchService = module.get<SearchService>(SearchService);
    postsRepository = module.get<Repository<PostEntity>>(POST_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await module.close();
  });

  it.each([undefined, '', '   '])(
    'returns an empty page without querying for query %p',
    async (query) => {
      const result = await searchService.findManyWithPagination(
        queryDto(query),
      );

      expect(result).toEqual({
        items: [],
        count: 0,
        currentPage: 1,
        totalPages: 0,
      });
      expect(postsRepository.find).not.toHaveBeenCalled();
    },
  );

  it('keeps posts matched by visible text or title, drops JSON-only hits', async () => {
    const byText = post(1, 'Догляд', 'Що їсть кіт щодня');
    const byTitle = post(2, 'Кіт і вакцинація', 'Графік щеплень');
    // `Like` по content влучив у службове поле, а не в текст.
    const jsonOnly = {
      ...post(3, 'Собаки', 'Прогулянки'),
      content: JSON.stringify({ root: { format: 'кіт', children: [] } }),
    } as unknown as PostEntity;
    jest
      .spyOn(postsRepository, 'find')
      .mockResolvedValue([byText, byTitle, jsonOnly]);

    const result = await searchService.findManyWithPagination(
      queryDto('  Кіт '),
    );

    expect(result.items).toEqual([byText, byTitle]);
    expect(result.count).toBe(2);
  });

  it('paginates after filtering and reports the real totals', async () => {
    const hits = Array.from({ length: 5 }, (_, i) =>
      post(i + 1, `Кіт ${i + 1}`, 'текст'),
    );
    const miss = post(99, 'Собаки', 'Прогулянки');
    jest
      .spyOn(postsRepository, 'find')
      .mockResolvedValue([hits[0], miss, ...hits.slice(1)]);

    const result = await searchService.findManyWithPagination(
      queryDto('кіт', 2, 2),
    );

    expect(result).toEqual({
      items: [hits[2], hits[3]],
      count: 5,
      currentPage: 2,
      totalPages: 3,
    });
  });

  it('treats non-JSON content as plain text instead of failing', async () => {
    const legacy = {
      ...post(1, 'Догляд', ''),
      content: 'Старий пост: кіт любить спати',
    } as unknown as PostEntity;
    const empty = { ...post(2, 'Порожній', ''), content: '' } as PostEntity;
    jest.spyOn(postsRepository, 'find').mockResolvedValue([legacy, empty]);

    const result = await searchService.findManyWithPagination(queryDto('кіт'));

    expect(result.items).toEqual([legacy]);
  });

  it('escapes LIKE wildcards in the query', async () => {
    const find = jest.spyOn(postsRepository, 'find').mockResolvedValue([]);

    await searchService.findManyWithPagination(queryDto('50%_a\\b'));

    const [{ where }] = find.mock.calls[0] as [{ where: any[] }];
    expect(where[0].title.value).toBe('%50\\%\\_a\\\\b%');
  });
});
