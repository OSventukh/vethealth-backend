import { IsIn, IsNotIn, IsOptional, IsString, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { CategoryEntity } from '../entities/category.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';

export class CategoryQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @Transform(includeStringToObjectTransform)
  @Validate(IsValidIncludes, ['children', 'posts', 'topics', 'parent'], {
    message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
  })
  include?: FindOptionsRelations<CategoryEntity>;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['CategoryEntity'], {
    message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID,
  })
  @IsNotIn(['parent'], { message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID })
  @IsString()
  readonly orderBy?: keyof CategoryEntity = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort?: FindOptionsOrderValue = 'ASC';
}
