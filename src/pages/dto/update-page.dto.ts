import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-page.dto';
import { IsString } from 'class-validator';

export class UpdatePageDto extends PartialType(CreatePageDto) {
  @IsString()
  id: string;
}
