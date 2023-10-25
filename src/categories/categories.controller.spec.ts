import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

describe('CategoriesController', () => {
  let categoriesController: CategoriesController;
  let categoriesService: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: createMock<CategoriesService>(),
        },
      ],
    }).compile();

    categoriesController =
      module.get<CategoriesController>(CategoriesController);
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(categoriesController).toBeDefined();
  });

  it('should call a categoriesService.create() method with CreateCategory object', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'Title category',
    };
    categoriesController.create(createCategoryDto);
    expect(categoriesService.create).toBeCalledWith(createCategoryDto);
  });

  it('should call a categoriesService.findManyWithPafination() method with provided page and size', () => {
    const queryDto: CategoryQueryDto = {
      page: 1,
      size: 5,
    };

    categoriesController.getMany(queryDto);
    expect(categoriesService.findManyWithPagination).toBeCalledWith(queryDto);
  });

  it('should call a categoriesService.update() method with provided id and payload object', () => {
    const payload: UpdateCategoryDto = {
      name: 'Test Title',
      id: 'testId',
    };
    categoriesController.update(payload);
    expect(categoriesService.update).toBeCalledWith(payload);
  });

  it('should call a postsSerice.softDelete() method with provided id', () => {
    const categoryId = '1';
    categoriesController.delete(categoryId);
    expect(categoriesService.softDelete).toBeCalledWith(categoryId);
  });
});
