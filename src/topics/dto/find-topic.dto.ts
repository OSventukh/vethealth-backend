import { PartialType } from '@nestjs/swagger';
import { CreateTopicDto } from './create-topic.dto';
import { Exclude } from 'class-transformer';

export class TopicWhereQueryDto extends PartialType(CreateTopicDto) {
  @Exclude()
  image?: any;

  @Exclude()
  categories?: any;

  @Exclude()
  parent?: any;

  @Exclude()
  children?: any;
}
