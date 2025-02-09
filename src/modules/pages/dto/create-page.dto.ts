import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { stringToSlugTransform } from '@/utils/transformers/slug-transform';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';

export class CreatePageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Validate(IsNotExist, ['PageEntity'], {
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
  @Validate(IsNotExist, ['PageEntity'], {
    message: ERROR_MESSAGE.SLUG_MUST_BE_UNIQUE,
  })
  slug: string;

  @ApiProperty({ type: () => PostStatusEntity })
  @Type(() => PostStatusEntity)
  @Validate(IsExist, ['PostStatusEntity', 'id'], {
    message: ERROR_MESSAGE.STATUS_IS_NOT_VALID,
  })
  status: PostStatusEntity;
}
