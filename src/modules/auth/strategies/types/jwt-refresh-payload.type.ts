import { SessionEntity } from '@/modules/session/entities/session.entity';

export type JwtRefreshPayloadType = {
  sessionId: SessionEntity['id'];
  hash: string;
  iat: number;
  exp: number;
};
