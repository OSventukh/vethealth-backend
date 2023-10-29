import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { TopicEntity } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { TopicQueryDto } from './dto/topic-query.dto';
import { topicOrder } from './utils/topic-order';

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

  async findOne(
    fields: FindOptionsWhere<TopicEntity>,
    include?: FindOptionsRelations<TopicEntity>,
  ): Promise<TopicEntity> {
    const topic = await this.topicsRepository.findOne({
      where: fields,
      relations: include,
    });
    if (!topic) {
      throw new NotFoundException();
    }
    return topic;
  }

  async findManyWithPagination(
    queryDto: TopicQueryDto,
  ): Promise<PaginationType<TopicEntity>> {
    const { title, slug, status, include, orderBy, sort, page, size } =
      queryDto;
    const [items, count] = await this.topicsRepository.findAndCount({
      where: {
        title,
        slug,
        status: {
          name: status,
        },
      },
      skip: (page - 1) * size,
      take: size,
      order: topicOrder(orderBy, sort),
      relations: include,
    });
    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
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
