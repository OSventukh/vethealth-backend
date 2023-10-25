import { IsString, IsOptional, IsArray, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { PostEntity } from '@/posts/entities/post.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { Transform } from 'class-transformer';

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
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    message: ERROR_MESSAGE.PARENT_IS_NOT_VALID,
  })
  @IsOptional()
  parent?: CategoryEntity | null;

  @ApiProperty({
    type: () => CategoryEntity,
    example: [{ id: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae' }],
  })
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.CHILD_IS_NOT_VALID,
  })
  @IsArray()
  @IsOptional()
  children?: CategoryEntity[] | null;
}
