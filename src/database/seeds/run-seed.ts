import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { RoleSeedService } from './role/role-seed.service';
import { TopicStatusSeedService } from './status/topic-status-seed.service';
import { UserStatusSeedService } from './status/user-status-seed.service';
import { PostStatusSeedService } from './status/post-status-seed.service';
import { UserSeedService } from './user/user-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  await app.get(RoleSeedService).run();
  await app.get(TopicStatusSeedService).run();
  await app.get(UserStatusSeedService).run();
  await app.get(PostStatusSeedService).run();
  await app.get(UserSeedService).run();
};

void runSeed();
