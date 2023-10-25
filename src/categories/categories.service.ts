import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoriesRepository: Repository<CategoryEntity>,
  ) {}

  create(createCategoryDto: CreateCategoryDto): Promise<CategoryEntity> {
    const topic = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(topic);
  }

  async findOne(
    fields: FindOptionsWhere<CategoryEntity>,
  ): Promise<CategoryEntity> {
    const topic = await this.categoriesRepository.findOne({ where: fields });
    if (!topic) {
      throw new NotFoundException();
    }
    return topic;
  }

  async findManyWithPagination(
    queryDto: CategoryQueryDto,
  ): Promise<PaginationType<CategoryEntity>> {
    const { name, include, orderBy, sort, page, size } = queryDto;
    const [items, count] = await this.categoriesRepository.findAndCount({
      where: { name },
      skip: (page - 1) * size,
      take: size,
      order: {
        [orderBy]: sort,
      },
      relations: include,
    });
    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }

  update(payload: DeepPartial<CategoryEntity>): Promise<CategoryEntity> {
    return this.categoriesRepository.save(
      this.categoriesRepository.create(payload),
    );
  }

  async softDelete(id: CategoryEntity['id']): Promise<void> {
    await this.categoriesRepository.softDelete(id);
  }
}
