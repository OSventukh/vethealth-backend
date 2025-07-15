import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsObject, 
  Validate, 
  IsJSON 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileEntity } from '@/files/entities/file.entity';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { ERROR_MESSAGE } from '@/utils/constants/errors';

export class CreateMetadataDto {
  @ApiProperty({ required: false, description: 'Custom title for search engines (max 60 chars)' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ required: false, description: 'Custom description for search engines (max 160 chars)' })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({ required: false, description: 'Comma-separated keywords for SEO' })
  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @ApiProperty({ type: () => FileEntity, required: false, description: 'Custom image for social sharing' })
  @IsObject()
  @IsOptional()
  @Validate(IsExist, ['FileEntity', 'id'], {
    message: ERROR_MESSAGE.IMAGE_IS_NOT_VALID,
  })
  metaImage?: FileEntity;

  @ApiProperty({ required: false, description: 'Canonical URL for duplicate content prevention' })
  @IsString()
  @IsOptional()
  canonicalUrl?: string;

  @ApiProperty({ required: false, description: 'Prevent search engine indexing' })
  @IsBoolean()
  @IsOptional()
  noIndex?: boolean;

  @ApiProperty({ required: false, description: 'Prevent following links' })
  @IsBoolean()
  @IsOptional()
  noFollow?: boolean;

  @ApiProperty({ required: false, description: 'Custom OpenGraph title' })
  @IsString()
  @IsOptional()
  ogTitle?: string;

  @ApiProperty({ required: false, description: 'Custom OpenGraph description' })
  @IsString()
  @IsOptional()
  ogDescription?: string;

  @ApiProperty({ type: () => FileEntity, required: false, description: 'Custom OpenGraph image' })
  @IsObject()
  @IsOptional()
  @Validate(IsExist, ['FileEntity', 'id'], {
    message: ERROR_MESSAGE.IMAGE_IS_NOT_VALID,
  })
  ogImage?: FileEntity;

  @ApiProperty({ required: false, description: 'Custom Twitter title' })
  @IsString()
  @IsOptional()
  twitterTitle?: string;

  @ApiProperty({ required: false, description: 'Custom Twitter description' })
  @IsString()
  @IsOptional()
  twitterDescription?: string;

  @ApiProperty({ type: () => FileEntity, required: false, description: 'Custom Twitter image' })
  @IsObject()
  @IsOptional()
  @Validate(IsExist, ['FileEntity', 'id'], {
    message: ERROR_MESSAGE.IMAGE_IS_NOT_VALID,
  })
  twitterImage?: FileEntity;

  @ApiProperty({ required: false, description: 'Twitter card type', enum: ['summary', 'summary_large_image', 'app', 'player'] })
  @IsString()
  @IsOptional()
  twitterCardType?: string;

  @ApiProperty({ required: false, description: 'JSON-LD structured data' })
  @IsObject()
  @IsOptional()
  structuredData?: Record<string, any>;
}
