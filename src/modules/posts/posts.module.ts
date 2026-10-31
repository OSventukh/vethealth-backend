import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { CreatePostGuard } from './guards/create-post.guard';
import { PostEntity } from './entities/post.entity';
import { PostRevisionEntity } from './entities/post-revision.entity';
import { PostRevisionsService } from './post-revisions.service';
import { PostRevisionsController } from './post-revisions.controller';
import { CategoryEntity } from '@/modules/categories/entities/category.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      PostRevisionEntity,
      CategoryEntity,
      TopicEntity,
      UserEntity,
    ]),
    MetadataModule,
  ],
  controllers: [PostsController, PostRevisionsController],
  providers: [
    PostsService,
    PostRevisionsService,
    CreatePostGuard,
    UsersService,
    IsValidColumn,
    IsExist,
    IsNotExist,
  ],
})
export class PostsModule {}
