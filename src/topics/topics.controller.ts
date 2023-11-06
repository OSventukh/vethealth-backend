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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

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
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    return this.topicsService.create(createTopicDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: TopicQueryDto,
  ): Promise<TopicEntity> {
    return this.topicsService.findOne({ id }, queryDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getMany(
    @Query() queryDto: TopicQueryDto,
  ): Promise<PaginationType<TopicEntity>> | Promise<TopicEntity> {
    if (queryDto?.slug) {
      return this.topicsService.findOne({ slug: queryDto.slug }, queryDto);
    }
    return this.topicsService.findManyWithPagination(queryDto);
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  update(@Body() updateTopicDto: UpdateTopicDto): Promise<TopicEntity> {
    return this.topicsService.update(updateTopicDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.topicsService.softDelete(id);
  }
}
