import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicOrderQueryDto } from './dto/order-topic.dto';
import { TopicWhereQueryDto } from './dto/find-topic.dto';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { TopicContentEnum } from './topic.enum';
import { FileEntity } from '@/files/entities/file.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';

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
      content: TopicContentEnum.Page,
      image: new FileEntity(),
      status: new TopicStatusEntity(),
    };
    topicsController.create(createTopicDto);
    expect(topicsService.create).toBeCalledWith(createTopicDto);
  });

  it('should call a topicsService.findOne() method with provided id', () => {
    const topicId = '1';
    topicsController.getOne(topicId);
    expect(topicsService.findOne).toBeCalledWith({ id: topicId });
  });

  it('should call a topicsService.findManyWithPafination() method with provided page and size', () => {
    const paginationQuery: PaginationQueryDto = {
      page: 1,
      size: 5,
    };

    topicsController.getMany(
      paginationQuery,
      new TopicOrderQueryDto(),
      new TopicWhereQueryDto(),
    );
    expect(topicsService.findManyWithPagination).toBeCalledWith(
      paginationQuery,
      new TopicWhereQueryDto(),
      new TopicOrderQueryDto().orderObject(),
    );
  });

  it('should call a topicsService.update() method with provided id and payload object', () => {
    const topicId = '1';
    const payload: UpdateTopicDto = {
      title: 'Test Title',
    };
    topicsController.update(topicId, payload);
    expect(topicsService.update).toBeCalledWith(topicId, payload);
  });

  it('should call a postsSerice.softDelete() method with provided id', () => {
    const topicId = '1';
    topicsController.delete(topicId);
    expect(topicsService.softDelete).toBeCalledWith(topicId);
  });
});
