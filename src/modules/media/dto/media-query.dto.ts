import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class MediaQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 40, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number;

  /** Зсув замість `page` — для довантаження «Показати ще». */
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  /** Пошук за назвою файлу, alt-текстом або шляхом. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /** Лише зображення без alt-тексту. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  missingAlt?: boolean;

  /** Лише файли, що ніде не використовуються (кандидати на видалення). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  unused?: boolean;

  /** Лише растрові зображення, вужчі за цю ширину (напр. 1200 — замалі для OG). */
  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  narrowerThan?: number;
}
