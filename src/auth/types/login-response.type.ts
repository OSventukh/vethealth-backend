import { UserEntity } from '@/users/entities/user.entity';

export type LoginResponseType = Readonly<{
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: UserEntity;
}>;
