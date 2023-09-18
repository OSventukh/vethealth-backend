import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageOrderQueryDto } from './dto/order-page.dto';
import { PageWhereQueryDto } from './dto/find-page.dto';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';

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
    pagesController.getOne(pageId);
    expect(pagesService.findOne).toBeCalledWith({ id: pageId });
  });

  it('should call a pagesService.findManyWithPafination() method with provided page and size', () => {
    const paginationQuery: PaginationQueryDto = {
      page: 1,
      size: 5,
    };

    pagesController.getMany(
      paginationQuery,
      new PageOrderQueryDto(),
      new PageWhereQueryDto(),
    );
    expect(pagesService.findManyWithPagination).toBeCalledWith(
      paginationQuery,
      new PageWhereQueryDto(),
      new PageOrderQueryDto().orderObject(),
    );
  });

  it('should call a pagesService.update() method with provided id and payload object', () => {
    const pageId = '1';
    const payload: UpdatePageDto = {
      title: 'Test Title',
    };
    pagesController.update(pageId, payload);
    expect(pagesService.update).toBeCalledWith(pageId, payload);
  });

  it('should call a pagesService.softDelete() method with provided id', () => {
    const pageId = '1';
    pagesController.delete(pageId);
    expect(pagesService.softDelete).toBeCalledWith(pageId);
  });
});
