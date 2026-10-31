import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  Like,
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

  async create(createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    await this.assertImageFree(createTopicDto.image?.id);
    const topic = this.topicsRepository.create(createTopicDto);
    return this.topicsRepository.save(topic);
  }

  async findOne(
    fields: FindOptionsWhere<TopicEntity>,
    queryDto?: TopicQueryDto,
  ): Promise<TopicEntity> {
    const { include, status } = queryDto;
    const topic = await this.topicsRepository.findOne({
      where: { ...fields, status: { name: status } },
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
    const { title, slug, status, include, orderBy, sort, page, size, showAll } =
      queryDto;
    const [items, count] = await this.topicsRepository.findAndCount({
      where: {
        title: title && Like(`%${title}%`),
        slug,
        ...(!showAll && { parent: IsNull() }),
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

  async update(payload: DeepPartial<TopicEntity>): Promise<TopicEntity> {
    await this.assertImageFree(payload.image?.id, payload.id);
    return this.topicsRepository.save(this.topicsRepository.create(payload));
  }

  /**
   * `topics.imageId` має UNIQUE-індекс (OneToOne), тож картинка іншої теми,
   * обрана з медіатеки, валила б збереження з 500 (ER_DUP_ENTRY). Індекс
   * охоплює й м'яко видалені теми — тому `withDeleted`.
   */
  private async assertImageFree(
    imageId: string | undefined,
    topicId?: string,
  ): Promise<void> {
    if (!imageId) return;
    const owner = await this.topicsRepository.findOne({
      where: { image: { id: imageId } },
      select: { id: true, title: true },
      withDeleted: true,
      loadEagerRelations: false,
    });
    if (owner && owner.id !== topicId) {
      throw new ConflictException({
        statusCode: 409,
        message: `Image is already used by topic "${owner.title}"`,
        errorCode: 'TOPIC_IMAGE_TAKEN',
        topic: { id: owner.id, title: owner.title },
      });
    }
  }

  async softDelete(id: TopicEntity['id']): Promise<void> {
    await this.topicsRepository.softDelete(id);
  }
}
