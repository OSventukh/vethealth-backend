import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { PostStatusEnum } from '../post-status.enum';

export class UpdatePostDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty()
  @IsEnum(PostStatusEnum)
  @IsOptional()
  status?: PostStatusEnum;

  @ApiProperty()
  @IsString()
  @IsOptional()
  featuredImage?: string;
}
