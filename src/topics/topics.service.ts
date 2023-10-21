import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { TopicEntity } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { TopicQueryDto } from './dto/topic-query.dto';

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
    queryDto: TopicQueryDto,
  ): Promise<PaginationType<TopicEntity>> {
    const { title, slug, status, include, order, sort, page, size } = queryDto;
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
      order:
        order === 'status' ? { status: { name: sort } } : { [order]: sort },
      relations: {
        users: include?.includes('users'),
        categories: include?.includes('categories'),
        page: include?.includes('page'),
        parent: include?.includes('parent'),
        children: include?.includes('children'),
      },
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
