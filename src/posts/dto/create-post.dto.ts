import { IsString, IsOptional, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { Type } from 'class-transformer';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { UserEntity } from '@/users/entities/user.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

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
  @Validate(IsExist, ['PostStatusEntity', 'id'], {
    message: ERROR_MESSAGE.STATUS_IS_NOT_VALID,
  })
  status: PostStatusEntity;

  @ApiProperty()
  @Validate(IsExist, ['FileEntity', 'id'], {
    message: ERROR_MESSAGE.IMAGE_IS_NOT_VALID,
  })
  @Type(() => FileEntity)
  @IsOptional()
  featuredImageFile?: FileEntity | null;

  @ApiProperty()
  @IsOptional()
  featuredImageUrl?: string;

  @ApiProperty()
  @Type(() => CategoryEntity)
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    message: ERROR_MESSAGE.CATEGORY_IS_NOT_VALID,
  })
  @IsOptional()
  @IsString()
  categories?: CategoryEntity[] | null;

  @ApiProperty()
  @Type(() => TopicEntity)
  @Validate(IsExist, ['TopicEntity', 'id'], {
    message: ERROR_MESSAGE.TOPIC_IS_NOT_VALID,
  })
  @IsOptional()
  topics?: TopicEntity[] | null;
}
