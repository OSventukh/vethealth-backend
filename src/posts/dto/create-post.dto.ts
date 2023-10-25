import { IsString, IsOptional, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { Transform, Type } from 'class-transformer';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { UserEntity } from '@/users/entities/user.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @Validate(IsNotExist, ['PostEntity'], {
    message: ERROR_MESSAGE.TITLE_MUST_BE_UNIQUE,
  })
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
  @Transform(({ obj }) => stringToSlugTransform(obj.slug))
  @Validate(IsNotExist, ['PostEntity'], {
    message: ERROR_MESSAGE.SLUG_MUST_BE_UNIQUE,
  })
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
    each: true,
    message: ERROR_MESSAGE.CATEGORY_IS_NOT_VALID,
  })
  @IsOptional()
  @IsString()
  categories?: CategoryEntity[] | null;

  @ApiProperty()
  @Type(() => TopicEntity)
  @Validate(IsExist, ['TopicEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.TOPIC_IS_NOT_VALID,
  })
  @IsOptional()
  topics?: TopicEntity[] | null;
}
