import { PartialType } from '@nestjs/swagger';
import { CreateTopicDto } from './create-topic.dto';
import { IsString } from 'class-validator';

export class UpdateTopicDto extends PartialType(CreateTopicDto) {
  @IsString()
  id: string;
}
