import { Validate, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { FindOptionsOrder } from 'typeorm';
import { PageEntity } from '../entities/page.entity';

export class PageOrderQueryDto {
  @Validate(IsValidColumn, ['PageEntity'], {
    message: 'ColumnNotValid',
  })
  @IsString()
  readonly order? = 'createdAt';
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort? = 'ASC';

  orderObject(): FindOptionsOrder<PageEntity> {
    return { [this.order]: this.sort };
  }
}
