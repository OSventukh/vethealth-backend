import { Test, TestingModule } from '@nestjs/testing';
import { IsNull, Like, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CategoriesService } from './categories.service';
import { createMock } from '@golevelup/ts-jest';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

describe('CategoriesService', () => {
  let categoriesService: CategoriesService;
  let categoriesRepository: Repository<CategoryEntity>;
  const CATEGORY_REPOSITORY_TOKEN = getRepositoryToken(CategoryEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CATEGORY_REPOSITORY_TOKEN,
          useValue: createMock<Repository<CategoryEntity>>(),
        },
      ],
    }).compile();

    categoriesService = module.get<CategoriesService>(CategoriesService);
    categoriesRepository = module.get<Repository<CategoryEntity>>(
      CATEGORY_REPOSITORY_TOKEN,
    );
  });

  it('should be defined', () => {
    expect(categoriesService).toBeDefined();
  });

  it('should call categoriesRepository.create() method with createCategoryDto object', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'Test name',
    };
    categoriesService.create(createCategoryDto);
    expect(categoriesRepository.create).toBeCalledWith(createCategoryDto);
  });

  it('should call categoriesRepository.findOne() method with object that have where field and passed value', () => {
    categoriesService.findOne(CategoryEntity['id']);
    expect(categoriesRepository.findOne).toBeCalledWith({
      where: CategoryEntity['id'],
    });
  });

  it('should call categoriesRepository.findAndCount() method with options', () => {
    const { name, include, page, size, orderBy, sort } = new CategoryQueryDto();
    categoriesService.findManyWithPagination(new CategoryQueryDto());
    expect(categoriesRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
      where: { name: name && Like(`%${name}%`), parent: IsNull() },
      order: {
        [orderBy]: sort,
      },
      relations: include,
    });
  });

  it('should call categoriesRepository.save() and categoriesRepository.create() methods', () => {
    const post: CategoryEntity = {
      id: '1',
      name: 'Test name',
    } as CategoryEntity;
    categoriesService.update(post);
    expect(categoriesRepository.save).toBeCalledWith(
      categoriesRepository.create(post),
    );
  });

  it('should call categoriesRepository.softDelete() with provided id', () => {
    const categoryId = 'id';
    categoriesService.softDelete(categoryId);
    expect(categoriesRepository.softDelete).toBeCalledWith(categoryId);
  });
});
