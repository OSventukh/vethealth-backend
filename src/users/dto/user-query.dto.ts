import { IsIn, IsOptional, IsString, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';

export class UserQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  firstname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @Validate(IsValidIncludes, ['topics'], {
    message: 'includesNotValid',
  })
  include?: string;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['TopicEntity'], {
    message: 'columnNotValid',
  })
  @IsString()
  readonly order? = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort? = 'ASC';
}
