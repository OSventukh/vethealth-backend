import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsNull, Like, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicEntity } from './entities/topic.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicContentTypeEnum } from './topic.enum';
import { FileEntity } from '@/modules/files/entities/file.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicQueryDto } from './dto/topic-query.dto';
import { topicOrder } from './utils/topic-order';

describe('TopicsService', () => {
  let module: TestingModule;
  let topicsService: TopicsService;
  let topicsRepository: jest.Mocked<Repository<TopicEntity>>;
  const TOPIC_REPOSITORY_TOKEN = getRepositoryToken(TopicEntity);

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        TopicsService,
        {
          provide: TOPIC_REPOSITORY_TOKEN,
          useValue: createMock<Repository<TopicEntity>>(),
        },
      ],
    }).compile();

    topicsService = module.get<TopicsService>(TopicsService);
    topicsRepository = module.get(TOPIC_REPOSITORY_TOKEN);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(topicsService).toBeDefined();
  });

  it('should call topicsRepository.create() method with createTopicDto object', async () => {
    const createTopicDto: CreateTopicDto = {
      title: 'Test topics',
      contentType: TopicContentTypeEnum.Page,
      image: new FileEntity(),
      slug: 'test-topics',
      status: new TopicStatusEntity(),
    };

    await topicsService.create(createTopicDto);
    expect(topicsRepository.create).toHaveBeenCalledWith(createTopicDto);
  });

  it('should call topicsRepository.findOne() mehtod with object that have where field and passed value', () => {
    const queryDto = new TopicQueryDto();
    const { include, status } = queryDto;

    topicsService.findOne(TopicEntity['id'], new TopicQueryDto());
    expect(topicsRepository.findOne).toHaveBeenCalledWith({
      where: { ...PostEntity['id'], status: { name: status } },
      relations: include,
    });
  });

  it('should call topicsRepository.findAdnCount() mehtod with options', () => {
    const queryDto = new TopicQueryDto();
    const { page, size, include, orderBy, sort, slug, title, status } =
      queryDto;

    topicsService.findManyWithPagination(queryDto);
    expect(topicsRepository.findAndCount).toHaveBeenCalledWith({
      skip: (page - 1) * size,
      take: size,
      where: {
        slug,
        title: title && Like(`%${title}%`),
        parent: IsNull(),
        status: {
          name: status,
        },
      },
      order: topicOrder(orderBy, sort),
      relations: include,
    });
  });

  it('should call topicsRepository.save() and postsRepository.create() mehtods', async () => {
    const topic: TopicEntity = {
      id: '1',
      title: 'Test topic',
    } as TopicEntity;

    await topicsService.update(topic);
    expect(topicsRepository.save).toHaveBeenCalledWith(
      topicsRepository.create(topic),
    );
  });

  it('refuses with 409 an image that already belongs to another topic', async () => {
    topicsRepository.findOne.mockResolvedValue({
      id: 'other',
      title: 'Коти',
    } as TopicEntity);

    const error = await topicsService
      .update({ id: '1', image: { id: 'img' } } as TopicEntity)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      errorCode: 'TOPIC_IMAGE_TAKEN',
      topic: { title: 'Коти' },
    });
    expect(topicsRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
    expect(topicsRepository.save).not.toHaveBeenCalled();
  });

  it("keeps the topic's own image", async () => {
    topicsRepository.findOne.mockResolvedValue({
      id: '1',
      title: 'Собаки',
    } as TopicEntity);

    await topicsService.update({
      id: '1',
      image: { id: 'img' },
    } as TopicEntity);

    expect(topicsRepository.save).toHaveBeenCalled();
  });

  it('should call topicsRepository.softDelete() with provided id', () => {
    const topicId = 'id';
    topicsService.softDelete(topicId);
    expect(topicsRepository.softDelete).toHaveBeenCalledWith(topicId);
  });
});
