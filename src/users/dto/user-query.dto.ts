import { IsIn, IsOptional, IsString, IsNotIn, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsValidIncludes } from '@/utils/validators/is-valid-includes.validator';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { ERROR_MESSAGE } from '@/utils/constants/errors';
import { FindOptionsOrderValue, FindOptionsRelations } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { includeStringToObjectTransform } from '@/utils/transformers/include-transform';

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
  @Transform(includeStringToObjectTransform)
  @Validate(IsValidIncludes, ['topics'], {
    message: ERROR_MESSAGE.INCLUDE_IS_NOT_VALID,
  })
  include?: FindOptionsRelations<UserEntity>;

  @ApiProperty({ required: false })
  @Validate(IsValidColumn, ['UserEntity'], {
    message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID,
  })
  @IsNotIn(
    ['password', 'confirmationToken', 'confirmationTokenExpirationDate'],
    { message: ERROR_MESSAGE.COLUMN_IS_NOT_VALID },
  )
  @IsString()
  readonly orderBy?: keyof UserEntity = 'createdAt';

  @ApiProperty({ required: false })
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort?: FindOptionsOrderValue = 'ASC';
}
