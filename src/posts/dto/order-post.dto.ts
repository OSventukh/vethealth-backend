import { Transform } from 'class-transformer';
import { IsIn, IsString, Validate } from 'class-validator';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { FindOptionsOrder } from 'typeorm';
import { PostEntity } from '../entities/post.entity';

export class PostOrderQueryDto {
  @Validate(IsValidColumn, ['Post'], {
    message: 'ColumnNotValid',
  })
  @IsString()
  readonly order? = 'createdAt';
  @IsIn(['DESC', 'ASC'])
  @Transform(({ value }) => value?.toUpperCase())
  readonly sort? = 'ASC';

  orderObject(): FindOptionsOrder<PostEntity> {
    return { [this.order]: this.sort };
  }
}
