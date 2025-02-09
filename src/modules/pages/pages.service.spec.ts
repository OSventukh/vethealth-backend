import { Test, TestingModule } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { PageEntity } from './entities/page.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { postOrder } from './utils/page-order';

describe('PagesService', () => {
  let module: TestingModule;
  let pagesService: PagesService;
  let pagesRepository: Repository<PageEntity>;

  const PAGE_REPOSITORY_TOKEN = getRepositoryToken(PageEntity);
  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        PagesService,
        {
          provide: PAGE_REPOSITORY_TOKEN,
          useValue: createMock<Repository<PageEntity>>(),
        },
      ],
    }).compile();

    pagesService = module.get<PagesService>(PagesService);
    pagesRepository = module.get<Repository<PageEntity>>(PAGE_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(pagesService).toBeDefined();
  });

  it('should call pagesRepository.create() method with createPageDto object', () => {
    const createPageDto: CreatePageDto = {
      title: 'Test title',
      content: 'Test content',
      slug: 'test-title',
      status: new PostStatusEntity(),
    };
    pagesService.create(createPageDto);
    expect(pagesRepository.create).toBeCalledWith(createPageDto);
  });

  it('should call pagesRepository.findOne() mehtod with object that have where field and passed value', () => {
    pagesService.findOne(PageEntity['id']);
    expect(pagesRepository.findOne).toBeCalledWith({
      where: PageEntity['id'],
    });
  });

  it('should call pagesRepository.findAdnCount() mehtod with options', () => {
    const { title, slug, status, include, page, size, orderBy, sort } =
      new PageQueryDto();

    pagesService.findManyWithPagination(new PageQueryDto());
    expect(pagesRepository.findAndCount).toBeCalledWith({
      where: {
        title,
        slug,
        status: {
          name: status,
        },
      },
      skip: (page - 1) * size,
      take: size,
      order: postOrder(orderBy, sort),
      relations: include,
    });
  });

  it('should call pagesRepository.save() and postsRepository.create() mehtods', () => {
    const page: PageEntity = {
      id: '1',
      title: 'Test page',
    } as PageEntity;

    pagesService.update(page);
    expect(pagesRepository.save).toBeCalledWith(pagesRepository.create(page));
  });

  it('should call pagesRepository.softDelete() with provided id', () => {
    const pageId = 'id';
    pagesService.softDelete(pageId);
    expect(pagesRepository.softDelete).toBeCalledWith(pageId);
  });
});
