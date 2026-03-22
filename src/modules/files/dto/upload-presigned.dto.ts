import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Fields } from '../constants/fields.enum';

export class UploadPresignedDto {
  @ApiProperty({ example: 'topic-image.webp' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 138723 })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({ enum: Fields, example: Fields.Topic })
  @IsEnum(Fields)
  field: Fields;

  @ApiProperty({ example: 'image/webp', required: false })
  @IsOptional()
  @IsString()
  contentType?: string;
}
