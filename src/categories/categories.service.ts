import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  DeepPartial,
  Like,
  IsNull,
  UpdateResult,
} from 'typeorm';

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
    queryDto: CategoryQueryDto,
  ): Promise<CategoryEntity> {
    const { topic, include } = queryDto;
    const category = await this.categoriesRepository.findOne({
      where: { ...fields, topics: { slug: topic } },
      relations: include,
    });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  async findManyWithPagination(
    queryDto: CategoryQueryDto,
  ): Promise<PaginationType<CategoryEntity>> {
    const { name, include, topic, orderBy, sort, page, size, showAll } =
      queryDto;

    const [items, count] = await this.categoriesRepository.findAndCount({
      where: {
        name: name && Like(`%${name}%`),
        ...(!showAll && { parent: IsNull() }),
        topics: { slug: topic },
      },
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

  softDelete(id: CategoryEntity['id']): Promise<UpdateResult> {
    return this.categoriesRepository.softDelete(id);
  }
}
