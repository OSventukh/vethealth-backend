import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateMediaDto {
  /** Порожній рядок прибирає alt. */
  @ApiProperty({ example: 'Ветеринар оглядає вухо рудого кота' })
  @IsString()
  @MaxLength(500)
  alt: string;
}
