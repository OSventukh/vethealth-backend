import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileEntity } from '@/files/entities/file.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicContentEnum } from '../topic.enum';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { PageEntity } from '@/pages/entities/page.entity';
import { TopicEntity } from '../entities/topic.entity';
import { DeepPartial } from 'typeorm';

export class CreateTopicDto {
  @ApiProperty()
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @ApiProperty({ type: () => FileEntity })
  image: FileEntity;

  @IsString()
  description?: string;

  @ApiProperty({ type: () => TopicStatusEntity })
  status: TopicStatusEntity;

  @ApiProperty({ enum: TopicContentEnum })
  content: TopicContentEnum;

  @ApiProperty({ type: () => CategoryEntity })
  categories?: CategoryEntity[] | null;

  @ApiProperty({ type: () => PageEntity })
  @IsOptional()
  page?: PageEntity | null;

  @ApiProperty({ type: () => TopicEntity })
  @IsOptional()
  parent?: DeepPartial<TopicEntity> | null;

  @ApiProperty({ type: () => TopicEntity })
  @IsOptional()
  children?: DeepPartial<TopicEntity> | null;
}
