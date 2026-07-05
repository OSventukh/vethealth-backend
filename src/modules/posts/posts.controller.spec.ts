import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { createMock } from '@golevelup/ts-jest';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { PostQueryDto } from './dto/post-query.dto';
import { CreatePostGuard } from './guards/create-post.guard';
import { ChildrenInterceptor } from './dto/interceptors/children.interceptor';

describe('PostsController', () => {
  let postsController: PostsController;
  let postsService: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: createMock<PostsService>(),
        },
      ],
    })
      // CreatePostGuard depends on UsersService (not provided here); bypass it —
      // these tests only assert controller→service delegation, not guard logic.
      .overrideGuard(CreatePostGuard)
      .useValue({ canActivate: () => true })
      // ChildrenInterceptor depends on Topic/Category repositories (not provided);
      // pass through — these tests don't exercise interceptor logic.
      .overrideInterceptor(ChildrenInterceptor)
      .useValue({ intercept: (_ctx, next) => next.handle() })
      .compile();

    postsController = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(postsController).toBeDefined();
  });

  it('should call a postsService.create() method with CreatePostDto object', () => {
    const createPostDto: CreatePostDto = {
      title: 'Test title',
      content: 'Test Content',
      author: new UserEntity(),
      status: new PostStatusEntity(),
    };
    postsController.create(createPostDto);
    expect(postsService.create).toBeCalledWith(createPostDto);
  });

  it('should call a postsService.findOne() method with provided id', () => {
    const postId = '1';
    const queryDto = new PostQueryDto();
    const request = { user: undefined };
    postsController.getOne(request, postId, queryDto);
    expect(postsService.findOne).toBeCalledWith(
      { id: postId },
      queryDto.include,
      undefined,
    );
  });

  it('should call a postsService.findManyWithPafination() method with provided page and size', () => {
    const queryDto: PostQueryDto = {
      page: 1,
      size: 10,
    };

    const request = { user: undefined };
    postsController.getMany(request, queryDto);
    expect(postsService.findManyWithPagination).toBeCalledWith(
      queryDto,
      undefined,
    );
  });

  it('should call a postsService.update() method with provided id and payload object', () => {
    const payload: UpdatePostDto = {
      title: 'Test Title',
      id: 'testId',
    };
    const request = { user: undefined };
    postsController.update(request, payload);
    expect(postsService.update).toBeCalledWith(payload, undefined);
  });

  it('should call a postsSerice.softDelete() method with provided id', () => {
    const postId = '1';
    const request = { user: undefined };
    postsController.delete(request, postId);
    expect(postsService.softDelete).toBeCalledWith(postId, undefined);
  });
});
