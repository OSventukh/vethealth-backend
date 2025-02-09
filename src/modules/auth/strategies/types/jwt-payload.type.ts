import { SessionEntity } from '@/modules/session/entities/session.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';

export type JwtPayloadType = Pick<UserEntity, 'id' | 'role'> & {
  sessionId: SessionEntity['id'];
  iat: number;
  exp: number;
};
