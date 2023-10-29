import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicContentTypeEnum } from './topic.enum';
import { FileEntity } from '@/files/entities/file.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicQueryDto } from './dto/topic-query.dto';

describe('TopicsController', () => {
  let module: TestingModule;
  let topicsController: TopicsController;
  let topicsService: TopicsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [TopicsController],
      providers: [
        { provide: TopicsService, useValue: createMock<TopicsService>() },
      ],
    }).compile();

    topicsController = module.get<TopicsController>(TopicsController);
    topicsService = module.get<TopicsService>(TopicsService);
  });

  it('should be defined', () => {
    expect(topicsController).toBeDefined();
  });

  it('should call a topicsService.create() method with CreateTopicDto object', () => {
    const createTopicDto: CreateTopicDto = {
      title: 'Test title',
      contentType: TopicContentTypeEnum.Page,
      image: new FileEntity(),
      status: new TopicStatusEntity(),
    };
    topicsController.create(createTopicDto);
    expect(topicsService.create).toBeCalledWith(createTopicDto);
  });

  it('should call a topicsService.findOne() method with provided id', () => {
    const topicId = '1';
    const queryDto = new TopicQueryDto();

    topicsController.getOne(topicId, queryDto);
    expect(topicsService.findOne).toBeCalledWith(
      { id: topicId },
      queryDto.include,
    );
  });

  it('should call a topicsService.findManyWithPafination() method with provided page and size', () => {
    const queryDto: TopicQueryDto = {
      page: 1,
      size: 5,
    };

    topicsController.getMany(queryDto);
    expect(topicsService.findManyWithPagination).toBeCalledWith(queryDto);
  });

  it('should call a topicsService.update() method with provided id and payload object', () => {
    const payload: UpdateTopicDto = {
      title: 'Test Title',
      id: 'testId',
    };
    topicsController.update(payload);
    expect(topicsService.update).toBeCalledWith(payload);
  });

  it('should call a topicsService.softDelete() method with provided id', () => {
    const topicId = '1';
    topicsController.delete(topicId);
    expect(topicsService.softDelete).toBeCalledWith(topicId);
  });
});
