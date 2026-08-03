import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GenerateSeoMetadataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ description: 'Plain text of the post/page content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30000)
  text: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  topics?: string[];

  @ApiProperty({ required: false, enum: ['post', 'page'] })
  @IsOptional()
  @IsIn(['post', 'page'])
  entityType?: 'post' | 'page';
}
