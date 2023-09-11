import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { Type } from 'class-transformer';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { UserEntity } from '@/users/entities/user.entity';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  excerpt: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty()
  @Type(() => UserEntity)
  author: UserEntity;

  @ApiProperty()
  @Type(() => PostStatusEntity)
  status: PostStatusEntity;

  @ApiProperty()
  @Type(() => FileEntity)
  @IsOptional()
  featuredImage?: FileEntity | null;

  @ApiProperty()
  @Type(() => CategoryEntity)
  @IsOptional()
  categories?: CategoryEntity[] | null;

  @ApiProperty()
  @Type(() => TopicEntity)
  @IsOptional()
  topics?: TopicEntity[] | null;
}
