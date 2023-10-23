import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { TopicEntity } from './entities/topic.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
@Module({
  imports: [TypeOrmModule.forFeature([TopicEntity])],
  controllers: [TopicsController],
  providers: [
    TopicsService,
    IsExist,
    IsNotExist,
    IsValidColumn,
    IsValidIncludes,
  ],
})
export class TopicsModule {}
