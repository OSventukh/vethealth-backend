import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PostEntity } from './entities/post.entity';
import { DeepPartial, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { CreatePostDto } from './dto/create-post.dto';
import { UserEntity } from '@/users/entities/user.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { PostOrderQueryDto } from './dto/order-post.dto';
import { PostWhereQueryDto } from './dto/find-post.dto';

describe('PostsService', () => {
  let postsService: PostsService;
  let postsRepository: Repository<PostEntity>;
  const POST_REPOSITORY_TOKEN = getRepositoryToken(PostEntity);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: POST_REPOSITORY_TOKEN,
          useValue: createMock<Repository<PostEntity>>(),
        },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    postsRepository = module.get<Repository<PostEntity>>(POST_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(postsService).toBeDefined();
  });

  it('should call postsRepository.create() method with createPostDto object', () => {
    const createPostDto: CreatePostDto = {
      title: 'Test title',
      content: 'Test content',
      excerpt: 'Test exerpt',
      author: new UserEntity(),
      status: new PostStatusEntity(),
    };
    postsService.create(createPostDto);
    expect(postsRepository.create).toBeCalledWith(createPostDto);
  });

  it('should call postsRepository.findOne() method with object that have where field and passed value', () => {
    postsService.findOne(PostEntity['id']);
    expect(postsRepository.findOne).toBeCalledWith({ where: PostEntity['id'] });
  });

  it('should call postsRepository.findAndCount() method with options', () => {
    const page = 1;
    const size = 5;
    postsService.findManyWithPagination(
      { page, size },
      new PostWhereQueryDto(),
      new PostOrderQueryDto().orderObject(),
    );
    expect(postsRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
      where: {},
      order: {
        createdAt: 'ASC',
      },
    });
  });

  it('should call postRepository.save() and postsRepository.create() methods', () => {
    const post: PostEntity = {
      id: '1',
      title: 'Test title',
    } as PostEntity;
    postsService.update(post.id, post.title as DeepPartial<PostEntity>);
    expect(postsRepository.save).toBeCalledWith(postsRepository.create(post));
  });

  it('should call postsRepository.softDelete() with provided id', () => {
    const postId = 'id';
    postsService.softDelete(postId);
    expect(postsRepository.softDelete).toBeCalledWith(postId);
  });
});
