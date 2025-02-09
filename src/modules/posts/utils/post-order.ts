import { FindOptionsOrder, FindOptionsOrderValue } from 'typeorm';
import { PostEntity } from '../entities/post.entity';

export function postOrder(
  orderBy: keyof PostEntity,
  sort: FindOptionsOrderValue,
): FindOptionsOrder<PostEntity> {
  switch (orderBy) {
    case 'author':
      return {
        author: {
          firstname: sort,
        },
      };
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
