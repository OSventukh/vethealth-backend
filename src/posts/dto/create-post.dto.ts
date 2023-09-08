import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  excerpt: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty()
  status: PostStatusEntity;

  @ApiProperty()
  @IsString()
  @IsOptional()
  featuredImage?: string;
}
