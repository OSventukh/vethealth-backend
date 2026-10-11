import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SEO_FIELDS, SeoField } from '../tasks/seo-metadata.task';
import { SeoMetadataFieldsDto } from './seo-metadata-fields.dto';

/** Налаштування генерації, спільні для форми редактора і масового SEO. */
export class SeoGenerationOptionsDto {
  @ApiProperty({
    required: false,
    enum: SEO_FIELDS,
    isArray: true,
    description:
      'Generate only these fields; omit for main fields (keywords are opt-in)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(SEO_FIELDS, { each: true })
  fields?: SeoField[];

  @ApiProperty({
    required: false,
    type: () => SeoMetadataFieldsDto,
    description: 'Current field values, used as context',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetadataFieldsDto)
  current?: SeoMetadataFieldsDto;

  @ApiProperty({ required: false, description: "Editor's wish for the result" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  hint?: string;

  @ApiProperty({
    required: false,
    description: 'Preferred search query, only if supported by the content',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  primaryKeyword?: string;
}
