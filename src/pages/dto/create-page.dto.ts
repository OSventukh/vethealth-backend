import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
export class CreatePageDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  slug: string;

  @Type(() => PostStatusEntity)
  status: PostStatusEntity;
}
