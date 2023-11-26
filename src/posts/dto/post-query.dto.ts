import { IsIn, IsNotIn, IsOptional, IsString, Validate } from 'class-validator';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PostEntity } from '../entities/post.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class PostQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'topic slug', example: 'dogs' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ description: 'category slug', example: 'treatment' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @Transform(includeStringToObjectTransform)
  @Validate(IsValidIncludes, ['topics', 'categories', 'author'], {
    message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
  })
  include?: FindOptionsRelations<PostEntity>;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['PostEntity'], {
    message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID,
  })
  @IsNotIn([], { message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID })
  @IsString()
  readonly orderBy?: keyof PostEntity = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort?: FindOptionsOrderValue = 'DESC';
}
