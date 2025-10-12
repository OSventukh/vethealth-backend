import {
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMetadataDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitterCard?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  indexable?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  followable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  structuredData?: any;
}
