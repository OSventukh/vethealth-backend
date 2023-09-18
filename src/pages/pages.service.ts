import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
} from 'typeorm';
import { PageEntity } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { PaginationOptions } from '@/utils/types/pagination-options.type';
import { PaginationType } from '@/utils/types/pagination.type';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(PageEntity)
    private readonly pagesRepository: Repository<PageEntity>,
  ) {}
  create(createPageDto: CreatePageDto): Promise<PageEntity> {
    const page = this.pagesRepository.create(createPageDto);
    return this.pagesRepository.save(page);
  }

  async findOne(fields: FindOptionsWhere<PageEntity>): Promise<PageEntity> {
    const page = await this.pagesRepository.findOne({ where: fields });
    if (!page) {
      throw new NotFoundException();
    }
    return page;
  }

  async findManyWithPagination(
    paginationOptions: PaginationOptions,
    fields: FindOptionsWhere<PageEntity>,
    order: FindOptionsOrder<PageEntity>,
  ): Promise<PaginationType<PageEntity>> {
    const [items, count] = await this.pagesRepository.findAndCount({
      where: fields,
      skip: (paginationOptions.page - 1) * paginationOptions.size,
      take: paginationOptions.size,
      order: order,
    });
    return {
      items,
      count,
      currentPage: paginationOptions.page,
      totalPages: Math.ceil(count / paginationOptions.size),
    };
  }

  update(
    id: PageEntity['id'],
    payload: DeepPartial<PageEntity>,
  ): Promise<PageEntity> {
    return this.pagesRepository.save(
      this.pagesRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: PageEntity['id']): Promise<void> {
    await this.pagesRepository.softDelete(id);
  }
}
