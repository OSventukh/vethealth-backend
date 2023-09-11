import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicEntity } from './entities/topic.entity';
import { TopicsService } from './topics.service';
import { TopicOrderQueryDto } from './dto/order-topic.dto';
import { TopicWhereQueryDto } from './dto/find-topic.dto';
import { PaginationType } from '@/utils/types/pagination.type';
import { UpdateTopicDto } from './dto/update-topic.dto';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsServise: TopicsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createTopic(@Body() createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    return this.topicsServise.create(createTopicDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOneTopic(@Param('id') id: string): Promise<TopicEntity> {
    return this.topicsServise.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllPosts(
    @Query() pagination: PaginationQueryDto,
    @Query() orderDto: TopicOrderQueryDto,
    @Query() whereDto: TopicWhereQueryDto,
  ): Promise<PaginationType<TopicEntity>> | Promise<TopicEntity> {
    if (whereDto.slug) {
      return this.topicsServise.findOne({ slug: whereDto.slug });
    }
    return this.topicsServise.findManyWithPagination(
      pagination,
      whereDto,
      orderDto.orderObject(),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateTopic(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ): Promise<TopicEntity> {
    return this.topicsServise.update(id, updateTopicDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTopic(@Param('id') id: string): Promise<void> {
    return this.topicsServise.softDelete(id);
  }
}
