import { FindOptionsOrder, FindOptionsOrderValue } from 'typeorm';
import { PageEntity } from '../entities/page.entity';

export function postOrder(
  orderBy: keyof PageEntity,
  sort: FindOptionsOrderValue,
): FindOptionsOrder<PageEntity> {
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
