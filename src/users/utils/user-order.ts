import { FindOptionsOrder, FindOptionsOrderValue } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

export function userOrder(
  orderBy: keyof UserEntity,
  sort: FindOptionsOrderValue,
): FindOptionsOrder<UserEntity> {
  switch (orderBy) {
    case 'role':
      return {
        role: {
          name: sort,
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
