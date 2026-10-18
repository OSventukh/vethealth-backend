import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class BulkDeleteMediaDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];

  /** Видалити й ті, що використовуються. Без нього такі лише повертаються в `inUse`. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
