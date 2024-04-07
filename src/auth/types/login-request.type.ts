import { SessionEntity } from '@/session/entities/session.entity';
import { UserEntity } from '@/users/entities/user.entity';

export type LoginRequestType = Readonly<{
  id: UserEntity['id'];
  role: UserEntity['role'];
  sessionId: SessionEntity['id'];
}>;
