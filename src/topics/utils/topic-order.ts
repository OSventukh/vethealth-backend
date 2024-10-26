import { FindOptionsOrder, FindOptionsOrderValue } from 'typeorm';
import { TopicEntity } from '../entities/topic.entity';

export function topicOrder(
  orderBy: keyof TopicEntity,
  sort: FindOptionsOrderValue,
): FindOptionsOrder<TopicEntity> {
  switch (orderBy) {
    case 'status':
      return {
        status: {
          name: sort,
        },
      };
    default:
      return { [orderBy]: sort };
  }
}
