import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DeepPartial } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicEntity } from './entities/topic.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicOrderQueryDto } from './dto/order-topic.dto';
import { TopicWhereQueryDto } from './dto/find-topic.dto';
import { TopicContentEnum } from './topic.enum';
import { FileEntity } from '@/files/entities/file.entity';
import { PostEntity } from '@/posts/entities/post.entity';

describe('TopicsService', () => {
  let module: TestingModule;
  let topicsService: TopicsService;
  let topicsRepository: Repository<TopicEntity>;
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
    topicsRepository = module.get<Repository<TopicEntity>>(
      TOPIC_REPOSITORY_TOKEN,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(topicsService).toBeDefined();
  });

  it('should call topicsRepository.create() method with createTopicDto object', () => {
    const createTopicDto: CreateTopicDto = {
      title: 'Test topics',
      content: TopicContentEnum.Page,
      image: new FileEntity(),
      slug: 'test-topics',
      status: new TopicStatusEntity(),
    };

    topicsService.create(createTopicDto);
    expect(topicsRepository.create).toBeCalledWith(createTopicDto);
  });

  it('should call topicsRepository.findOne() mehtod with object that have where field and passed value', () => {
    topicsService.findOne(TopicEntity['id']);
    expect(topicsRepository.findOne).toBeCalledWith({
      where: PostEntity['id'],
    });
  });

  it('should call topicsRepository.findAdnCount() mehtod with options', () => {
    const page = 1;
    const size = 5;
    topicsService.findManyWithPagination(
      { page, size },
      new TopicWhereQueryDto(),
      new TopicOrderQueryDto().orderObject(),
    );
    expect(topicsRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
      where: {},
      order: {
        createdAt: 'ASC',
      },
    });
  });

  it('should call topicsRepository.save() and postsRepository.create() mehtods', () => {
    const topic: TopicEntity = {
      id: '1',
      title: 'Test topic',
    } as TopicEntity;

    topicsService.update(topic.id, topic.title as DeepPartial<TopicEntity>);
    expect(topicsRepository.save).toBeCalledWith(
      topicsRepository.create(topic),
    );
  });

  it('should call topicsRepository.softDelete() with provided id', () => {
    const topicId = 'id';
    topicsService.softDelete(topicId);
    expect(topicsRepository.softDelete).toBeCalledWith(topicId);
  });
});
