import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { TopicEntity } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PaginationOptions } from '@/utils/types/pagination-options.type';
import { PaginationType } from '@/utils/types/pagination.type';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private topicsRepository: Repository<TopicEntity>,
  ) {}

  create(createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    const topic = this.topicsRepository.create(createTopicDto);
    return this.topicsRepository.save(topic);
  }

  async findOne(fields: FindOptionsWhere<TopicEntity>): Promise<TopicEntity> {
    const topic = await this.topicsRepository.findOne({ where: fields });
    if (!topic) {
      throw new NotFoundException();
    }
    return topic;
  }

  async findManyWithPagination(
    paginationOptions: PaginationOptions,
    fields: FindOptionsWhere<TopicEntity>,
    order: FindOptionsOrder<TopicEntity>,
  ): Promise<PaginationType<TopicEntity>> {
    const [items, count] = await this.topicsRepository.findAndCount({
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
    id: TopicEntity['id'],
    payload: DeepPartial<TopicEntity>,
  ): Promise<TopicEntity> {
    return this.topicsRepository.save(
      this.topicsRepository.create({ id, ...payload }),
    );
  }

  async softDelete(id: TopicEntity['id']): Promise<void> {
    await this.topicsRepository.softDelete(id);
  }
}
