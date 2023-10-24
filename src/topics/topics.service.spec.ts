import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicEntity } from './entities/topic.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicContentTypeEnum } from './topic.enum';
import { FileEntity } from '@/files/entities/file.entity';
import { PostEntity } from '@/posts/entities/post.entity';
import { TopicQueryDto } from './dto/topic-query.dto';
import { topicOrder } from './utils/topic-order';

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
      contentType: TopicContentTypeEnum.Page,
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
    const queryDto = new TopicQueryDto();
    const { page, size, include, orderBy, sort, slug, title, status } =
      queryDto;

    topicsService.findManyWithPagination(queryDto);
    expect(topicsRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
      where: {
        slug,
        title,
        status: {
          name: status,
        },
      },
      order: topicOrder(orderBy, sort),
      relations: include,
    });
  });

  it('should call topicsRepository.save() and postsRepository.create() mehtods', () => {
    const topic: TopicEntity = {
      id: '1',
      title: 'Test topic',
    } as TopicEntity;

    topicsService.update(topic);
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
