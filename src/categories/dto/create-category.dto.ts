import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { DeepPartial } from 'typeorm';
import { PostEntity } from '@/posts/entities/post.entity';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @ApiProperty({ type: () => PostEntity })
  posts?: PostEntity[] | null;

  @ApiProperty({ type: () => TopicEntity })
  topics?: TopicEntity[] | null;

  @ApiProperty({ type: () => CategoryEntity })
  @IsOptional()
  parent?: DeepPartial<CategoryEntity> | null;

  @ApiProperty({ type: () => CategoryEntity })
  @IsOptional()
  children?: DeepPartial<CategoryEntity>[] | null;
}
