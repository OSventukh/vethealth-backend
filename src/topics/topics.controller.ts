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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicEntity } from './entities/topic.entity';
import { TopicsService } from './topics.service';
import { PaginationType } from '@/utils/types/pagination.type';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicQueryDto } from './dto/topic-query.dto';
import { GetTopicsGuard } from './guards/get-topics.guard';
import { Roles } from '@/roles/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { RolesSerializerInterceptor } from '@/auth/interceptors/roles-serializer.interceptor';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @Roles(RoleEnum.SuperAdmin, RoleEnum.Admin)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTopicDto: CreateTopicDto): Promise<TopicEntity> {
    return this.topicsService.create(createTopicDto);
  }

  @Get(':id')
  @UseInterceptors(RolesSerializerInterceptor)
  @HttpCode(HttpStatus.OK)
  getOne(
    @Param('id') id: string,
    @Query() queryDto: TopicQueryDto,
  ): Promise<TopicEntity> {
    return this.topicsService.findOne({ id }, queryDto);
  }

  @Get()
  @UseInterceptors(RolesSerializerInterceptor)
  @UseGuards(GetTopicsGuard)
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
