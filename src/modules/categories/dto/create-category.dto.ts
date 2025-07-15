import {
  IsString,
  IsOptional,
  IsArray,
  Validate,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { PostEntity } from '@/posts/entities/post.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { Transform, Type } from 'class-transformer';
import { CreateMetadataDto } from '@/metadata/dto/create-metadata.dto';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ obj }) => stringToSlugTransform(obj.slug))
  @Validate(IsNotExist, ['CategoryEntity'], {
    message: ERROR_MESSAGE.SLUG_MUST_BE_UNIQUE,
  })
  slug?: string;

  // SEO data
  @ApiProperty({ type: () => CreateMetadataDto, required: false })
  @Type(() => CreateMetadataDto)
  @IsOptional()
  metadata?: CreateMetadataDto;

  @ApiProperty({ type: () => PostEntity })
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.POST_IS_NOT_VALID,
  })
  @IsOptional()
  posts?: PostEntity[] | null;

  @ApiProperty({ type: () => TopicEntity })
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.TOPIC_IS_NOT_VALID,
  })
  @IsArray()
  @IsOptional()
  topics?: TopicEntity[] | null;

  @ApiProperty({
    type: () => CategoryEntity,
    example: { id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' },
  })
  @IsObject()
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    message: ERROR_MESSAGE.PARENT_IS_NOT_VALID,
  })
  @IsOptional()
  parent?: CategoryEntity | null;
}
