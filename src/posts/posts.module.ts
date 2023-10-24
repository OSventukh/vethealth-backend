import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostEntity } from './entities/post.entity';
import { IsValidColumn } from '@/utils/validators/is-valid-column.validator';
import { IsExist } from '@/utils/validators/is-exist.validator';
import { IsNotExist } from '@/utils/validators/is-not-exist.validator';
import { CreatePostGuard } from './guards/create-post.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity])],
  controllers: [PostsController],
  providers: [
    PostsService,
    CreatePostGuard,
    IsValidColumn,
    IsExist,
    IsNotExist,
  ],
})
export class PostsModule {}
