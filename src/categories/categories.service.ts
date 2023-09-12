import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindOptionsOrder,
  DeepPartial,
} from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PaginationOptions } from '@/utils/types/pagination-options.type';
import { PaginationType } from '@/utils/types/pagination.type';

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
    paginationOptions: PaginationOptions,
    fields: FindOptionsWhere<CategoryEntity>,
    order: FindOptionsOrder<CategoryEntity>,
  ): Promise<PaginationType<CategoryEntity>> {
    const [items, count] = await this.categoriesRepository.findAndCount({
      where: { ...fields },
      skip: (paginationOptions.page - 1) * paginationOptions.size,
      take: paginationOptions.size,
      order: {
        ...order,
      },
    });
    return {
      items,
      count,
      currentPage: paginationOptions.page,
      totalPages: Math.ceil(count / paginationOptions.size),
    };
  }

  update(
    id: CategoryEntity['id'],
    payload: DeepPartial<CategoryEntity>,
  ): Promise<CategoryEntity> {
    return this.categoriesRepository.save(
      this.categoriesRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: CategoryEntity['id']): Promise<void> {
    await this.categoriesRepository.softDelete(id);
  }
}
