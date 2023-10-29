import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';

describe('PagesController', () => {
  let module: TestingModule;
  let pagesController: PagesController;
  let pagesService: PagesService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [
        {
          provide: PagesService,
          useValue: createMock<PagesService>(),
        },
      ],
    }).compile();

    pagesController = module.get<PagesController>(PagesController);
    pagesService = module.get<PagesService>(PagesService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(pagesController).toBeDefined();
  });

  it('should call a pagesService.create() method with CreatePageDto object', () => {
    const createPageDto: CreatePageDto = {
      title: 'Test title',
      content: 'Test content',
      slug: 'test-title',
      status: new PostStatusEntity(),
    };
    pagesController.create(createPageDto);
    expect(pagesService.create).toBeCalledWith(createPageDto);
  });

  it('should call a pagesService.findOne() method with provided id', () => {
    const pageId = '1';
    const queryDto = new PageQueryDto();
    pagesController.getOne(pageId, queryDto);
    expect(pagesService.findOne).toBeCalledWith(
      { id: pageId },
      queryDto.include,
    );
  });

  it('should call a pagesService.findManyWithPafination() method with provided page and size', () => {
    const queryDto: PageQueryDto = {
      page: 1,
      size: 5,
    };

    pagesController.getMany(queryDto);
    expect(pagesService.findManyWithPagination).toBeCalledWith(queryDto);
  });

  it('should call a pagesService.update() method with provided id and payload object', () => {
    const payload: UpdatePageDto = {
      title: 'Test Title',
      id: 'testid',
    };
    pagesController.update(payload);
    expect(pagesService.update).toBeCalledWith(payload);
  });

  it('should call a pagesService.softDelete() method with provided id', () => {
    const pageId = '1';
    pagesController.delete(pageId);
    expect(pagesService.softDelete).toBeCalledWith(pageId);
  });
});
