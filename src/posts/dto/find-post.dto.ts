import { CreatePostDto } from './create-post.dto';
import { PartialType } from '@nestjs/mapped-types';

export class PostWhereQueryDto extends PartialType(CreatePostDto) {}
