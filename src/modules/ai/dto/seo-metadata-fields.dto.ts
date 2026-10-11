import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Ліміти — за колонками `metadata`: заголовки varchar(255), решта text
// (тут обмежені розумною довжиною, а не ємністю колонки).
const TITLE_MAX = 255;
const TEXT_MAX = 1000;

/** Пʼять SEO-полів, які генерує ШІ і редагує людина. */
export class SeoMetadataFieldsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TITLE_MAX)
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TITLE_MAX)
  ogTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  ogDescription?: string;
}
