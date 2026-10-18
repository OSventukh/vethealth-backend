import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '@/modules/ai/ai.module';
import { FileEntity } from '@/modules/files/entities/file.entity';
import { FilesModule } from '@/modules/files/files.module';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, PostEntity, PageEntity, TopicEntity]),
    FilesModule,
    AiModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
