import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateAltDto {
  /** Поточний alt із форми (може бути ще не збережений). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  current?: string;

  /** Побажання редактора до результату. */
  @ApiPropertyOptional({ example: 'коротше, згадай породу' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  hint?: string;
}
