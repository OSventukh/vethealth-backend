import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStatusEntity } from '@/statuses/entities/user-status.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { TopicStatusEntity } from '@/statuses/entities/topic-status.entity';
import { PostStatusSeedService } from './post-status-seed.service';
import { TopicStatusSeedService } from './topic-status-seed.service';
import { UserStatusSeedService } from './user-status-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStatusEntity,
      PostStatusEntity,
      TopicStatusEntity,
    ]),
  ],
  providers: [
    PostStatusSeedService,
    TopicStatusSeedService,
    UserStatusSeedService,
  ],
  exports: [
    PostStatusSeedService,
    TopicStatusSeedService,
    UserStatusSeedService,
  ],
})
export class StatusSeedModule {}
