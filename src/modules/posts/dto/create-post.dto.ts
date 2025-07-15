import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  Validate,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { FileEntity } from '@/files/entities/file.entity';
import { UserEntity } from '@/users/entities/user.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { TopicEntity } from '@/topics/entities/topic.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { CreateMetadataDto } from '@/metadata/dto/create-metadata.dto';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Validate(IsNotExist, ['PostEntity'], {
    message: ERROR_MESSAGE.TITLE_MUST_BE_UNIQUE,
  })
  title: string;

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

  // SEO data
  @ApiProperty({ type: () => CreateMetadataDto, required: false })
  @Type(() => CreateMetadataDto)
  @IsOptional()
  metadata?: CreateMetadataDto;

  @ApiProperty()
  @Type(() => CategoryEntity)
  @IsArray()
  @Validate(IsExist, ['CategoryEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.CATEGORY_IS_NOT_VALID,
  })
  @IsOptional()
  categories?: CategoryEntity[] | null;

  @ApiProperty()
  @Type(() => TopicEntity)
  @IsArray()
  @Validate(IsExist, ['TopicEntity', 'id'], {
    each: true,
    message: ERROR_MESSAGE.TOPIC_IS_NOT_VALID,
  })
  @IsOptional()
  topics?: TopicEntity[] | null;
}
