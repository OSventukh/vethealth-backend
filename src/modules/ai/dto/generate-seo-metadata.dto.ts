import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SeoEntityType } from '../tasks/seo-metadata.task';
import { SeoGenerationOptionsDto } from './seo-generation-options.dto';

export class GenerateSeoMetadataDto extends SeoGenerationOptionsDto {
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

  @ApiProperty({ required: false, enum: ['post', 'page', 'topic'] })
  @IsOptional()
  @IsIn(['post', 'page', 'topic'])
  entityType?: SeoEntityType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sourceTruncated?: boolean;
}
