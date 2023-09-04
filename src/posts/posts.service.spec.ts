import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { DeepPartial, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatusEnum } from './post-status.enum';
import { CreateUserDto } from '@/users/dto/create-user.dto';

describe('PostsService', () => {
  let postsService: PostsService;
  let postsRepository: Repository<Post>;
  const POST_REPOSITORY_TOKEN = getRepositoryToken(Post);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: POST_REPOSITORY_TOKEN,
          useValue: createMock<Repository<Post>>(),
        },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    postsRepository = module.get<Repository<Post>>(POST_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(postsService).toBeDefined();
  });

  it('should call postsRepository.create() method with createPostDto object', () => {
    const createPostDto: CreatePostDto = {
      title: 'Test title',
      content: 'Test content',
      excerpt: 'Test exerpt',
      status: PostStatusEnum.Draft,
    };
    postsService.create(createPostDto);
    expect(postsRepository.create).toBeCalledWith(createPostDto);
  });

  it('should call postsRepository.findOne() method with object that have where field and passed value', () => {
    postsService.findOne(Post['id']);
    expect(postsRepository.findOne).toBeCalledWith({ where: Post['id'] });
  });

  it('should call postsRepository.findAndCount() method with options', () => {
    const page = 1;
    const size = 5;
    postsService.findManyWithPagination({ page, size });
    expect(postsRepository.findAndCount).toBeCalledWith({
      skip: (page - 1) * size,
      take: size,
    });
  });

  it('should call postRepository.save() and postsRepository.create() methods', () => {
    const post: Post = {
      id: '1',
      title: 'Test title',
    } as Post;
    postsService.update(post.id, post.title as DeepPartial<Post>);
    expect(postsRepository.save).toBeCalledWith(postsRepository.create(post));
  });

  it('should call postsRepository.softDelete() with provided id', () => {
    const postId = 'id';
    postsService.softDelete(postId);
    expect(postsRepository.softDelete).toBeCalledWith(postId);
  });
});
