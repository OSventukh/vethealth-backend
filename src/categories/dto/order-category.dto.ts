import { Transform } from 'class-transformer';
import { IsIn, IsString, Validate } from 'class-validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { FindOptionsOrder } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';

export class CategoryOrderQueryDto {
  @Validate(IsValidColumn, ['CategoryEntity'], {
    message: 'ColumnNotValid',
  })
  @IsString()
  readonly order? = 'createdAt';
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort? = 'ASC';

  orderObject(): FindOptionsOrder<CategoryEntity> {
    return { [this.order]: this.sort };
  }
}
