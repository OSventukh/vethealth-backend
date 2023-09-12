import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { Exclude } from 'class-transformer';

export class CategoryWhereQueryDto extends PartialType(CreateCategoryDto) {
  @Exclude()
  posts?: any;

  @Exclude()
  topics?: any;

  @Exclude()
  parent?: any;

  @Exclude()
  children?: any;
}
