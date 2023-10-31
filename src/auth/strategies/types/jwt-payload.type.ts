import { SessionEntity } from '@/session/entities/session.entity';
import { UserEntity } from '@/users/entities/user.entity';

export type JwtPayloadType = Pick<UserEntity, 'id' | 'role'> & {
  sessionId: SessionEntity['id'];
  iat: number;
  exp: number;
};
