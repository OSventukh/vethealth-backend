import { IsIn, IsNotIn, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { Transform } from 'class-transformer';
import { FindOptionsOrderValue } from 'typeorm';

export class TopicQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @Validate(
    IsValidIncludes,
    ['posts', 'categories', 'page', 'parent', 'children', 'users'],
    {
      message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
    },
  )
  include?: string;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['TopicEntity'], {
    message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID,
  })
  @IsNotIn([], { message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID })
  @IsString()
  order? = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  sort?: FindOptionsOrderValue = 'ASC';
}
