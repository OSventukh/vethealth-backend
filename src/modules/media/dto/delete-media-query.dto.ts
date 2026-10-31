import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteMediaQueryDto {
  /** Видалити попри використання (редактор уже бачив попередження). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  force?: boolean;
}
