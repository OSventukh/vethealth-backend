import { Transform } from 'class-transformer';
import { IsIn, IsString, Validate } from 'class-validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { FindOptionsOrder } from 'typeorm';
import { TopicEntity } from '../entities/topic.entity';

export class TopicOrderQueryDto {
  @Validate(IsValidColumn, ['TopicEntity'], {
    message: 'ColumnNotValid',
  })
  @IsString()
  readonly order? = 'createdAt';
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort? = 'ASC';

  orderObject(): FindOptionsOrder<TopicEntity> {
    return { [this.order]: this.sort };
  }
}
