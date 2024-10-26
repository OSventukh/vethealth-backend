import {
  IsString,
  IsOptional,
  Validate,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileEntity } from '@/files/entities/file.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { TopicContentTypeEnum } from '../topic.enum';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { PageEntity } from '@/pages/entities/page.entity';
import { TopicEntity } from '../entities/topic.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { Transform } from 'class-transformer';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';

export class CreateTopicDto {
  @ApiProperty()
  @IsString()
  @Validate(IsNotExist, ['TopicEntity'], {
    message: ERROR_MESSAGE.TITLE_MUST_BE_UNIQUE,
  })
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @Transform(({ obj }) => stringToSlugTransform(obj.slug))
  @Validate(IsNotExist, ['TopicEntity'], {
    message: ERROR_MESSAGE.SLUG_MUST_BE_UNIQUE,
  })
  slug?: string;

  @ApiProperty({ type: () => FileEntity })
  @IsObject()
  @Validate(IsExist, ['FileEntity', 'id'], {
    message: ERROR_MESSAGE.IMAGE_IS_NOT_VALID,
  })
  image: FileEntity;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: TopicContentTypeEnum,
    examples: TopicContentTypeEnum,
  })
  @IsEnum(TopicContentTypeEnum)
  @IsEnum(TopicContentTypeEnum)
  contentType: TopicContentTypeEnum;

  @ApiProperty({ type: () => TopicStatusEntity })
  @IsObject()
  @Validate(IsExist, ['TopicStatusEntity', 'id'], {
    message: ERROR_MESSAGE.STATUS_IS_NOT_VALID,
  })
  status: TopicStatusEntity;

  @ApiProperty({
    type: () => CategoryEntity,
    example: [{ id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' }],
  })
  @IsArray()
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.CATEGORY_IS_NOT_VALID,
  })
  @IsOptional()
  categories?: CategoryEntity[] | null;

  @ApiProperty({
    type: () => PageEntity,
    example: { id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' },
  })
  @IsObject()
  @IsOptional()
  @Validate(IsExist, ['PageEntity', 'id'], {
    message: ERROR_MESSAGE.PAGE_IS_NOT_VALID,
  })
  page?: PageEntity | null;

  @ApiProperty({
    type: () => TopicEntity,
    example: { id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' },
  })
  @IsObject()
  @Validate(IsExist, ['TopicEntity', 'id'], {
    message: ERROR_MESSAGE.PARENT_IS_NOT_VALID,
  })
  @IsOptional()
  parent?: TopicEntity | null;

  @ApiProperty({
    type: () => TopicEntity,
    example: [{ id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' }],
  })
  @IsArray()
  @Validate(IsExist, ['TopicEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.CHILD_IS_NOT_VALID,
  })
  @IsOptional()
  children?: TopicEntity[] | null;
}
