import { SessionEntity } from '@/modules/session/entities/session.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';

export type LoginRequestType = Readonly<{
  id: UserEntity['id'];
  role: UserEntity['role'];
  sessionId: SessionEntity['id'];
  hash: string;
}>;
