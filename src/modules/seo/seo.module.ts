import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '@/modules/ai/ai.module';
import { MetadataEntity } from '@/modules/metadata/entities/metadata.entity';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      PageEntity,
      TopicEntity,
      MetadataEntity,
    ]),
    AiModule,
  ],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
