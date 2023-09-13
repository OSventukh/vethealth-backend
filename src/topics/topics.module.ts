import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { TopicEntity } from './entities/topic.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
@Module({
  imports: [TypeOrmModule.forFeature([TopicEntity])],
  controllers: [TopicsController],
  providers: [TopicsService, IsExist],
})
export class TopicsModule {}
