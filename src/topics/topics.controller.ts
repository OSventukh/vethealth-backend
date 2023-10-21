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
import { PaginationType } from '@/utils/types/pagination.type';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicQueryDto } from './dto/topic-query.dto';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    return this.topicsService.create(createTopicDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(@Param('id') id: string): Promise<TopicEntity> {
    return this.topicsService.findOne({ id });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: TopicQueryDto,
  ): Promise<PaginationType<TopicEntity>> | Promise<TopicEntity> {
    if (queryDto?.slug) {
      return this.topicsService.findOne({ slug: queryDto.slug });
    }
    return this.topicsService.findManyWithPagination(queryDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ): Promise<TopicEntity> {
    return this.topicsService.update(id, updateTopicDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.topicsService.softDelete(id);
  }
}
