import { IsIn, IsNotIn, IsOptional, IsString, Validate } from 'class-validator';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PostEntity } from '@/posts/entities/post.entity';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class SearchQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchQuery?: string;
}
