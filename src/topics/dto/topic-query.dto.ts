import {
  IsBoolean,
  IsIn,
  IsNotIn,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';

import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { TopicEntity } from '../entities/topic.entity';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';

export class TopicQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status? = 'active';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsIn([true, false, ''])
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '';
    }
    return value === true || value === false || value === '';
  })
  @IsOptional()
  showAll?: boolean;

  @ApiProperty({ required: false })
  @Transform(includeStringToObjectTransform)
  @Validate(
    IsValidIncludes,
    ['posts', 'categories', 'page', 'parent', 'children', 'users'],
    {
      message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
    },
  )
  include?: FindOptionsRelations<TopicEntity>;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['TopicEntity'], {
    message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID,
  })
  @IsNotIn([], { message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID })
  @IsString()
  orderBy?: keyof TopicEntity = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  sort?: FindOptionsOrderValue = 'ASC';
}
