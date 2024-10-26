import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';
import { PageEntity } from '../entities/page.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';
import { IsIn, IsOptional, IsString, Validate } from 'class-validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';

export class PageQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty()
  @Transform(includeStringToObjectTransform)
  @Validate(IsValidIncludes, [], {
    message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
  })
  include?: FindOptionsRelations<PageEntity>;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['PageEntity'])
  orderBy?: keyof PageEntity = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  sort?: FindOptionsOrderValue = 'ASC';
}
