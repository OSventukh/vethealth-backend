import { SessionEntity } from '@/modules/session/entities/session.entity';

export type JwtRefreshPayloadType = {
  sessionId: SessionEntity['id'];
  iat: number;
  exp: number;
};
