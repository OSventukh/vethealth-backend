import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { PageEntity } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { PageQueryDto } from './dto/page-query.dto';
import { postOrder } from './utils/page-order';

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
    queryDto: PageQueryDto,
  ): Promise<PaginationType<PageEntity>> {
    const { title, slug, status, page, size, include, orderBy, sort } =
      queryDto;
    const [items, count] = await this.pagesRepository.findAndCount({
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
    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }

  update(payload: DeepPartial<PageEntity>): Promise<PageEntity> {
    return this.pagesRepository.save(this.pagesRepository.create(payload));
  }

  async softDelete(id: PageEntity['id']): Promise<void> {
    await this.pagesRepository.softDelete(id);
  }
}
