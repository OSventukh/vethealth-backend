import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatusEnum } from '../post-status.enum';

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
  @IsEnum(PostStatusEnum)
  status: PostStatusEnum;

  @ApiProperty()
  @IsString()
  @IsOptional()
  featuredImage?: string;
}
