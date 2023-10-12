import { CreatePostDto } from './create-post.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude } from 'class-transformer';

export class PostWhereQueryDto extends PartialType(CreatePostDto) {
  @Exclude()
  featuredImageFile?: any;

  @Exclude()
  author: any;

  @Exclude()
  categories?: any;

  @Exclude()
  topics?: any;
}
