import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { createMock } from '@golevelup/ts-jest';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatusEnum } from './post-status.enum';
import { PaginationQueryDto } from '@/utils/dto/pagination.dto';
import { PostWhereQueryDto } from './dto/find-post.dto';
import { PostOrderQueryDto } from './dto/order-post.dto';
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
    }).compile();

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
      excerpt: 'Test excerpt',
      status: PostStatusEnum.Draft,
    };
    postsController.createPost(createPostDto);
    expect(postsService.create).toBeCalledWith(createPostDto);
  });

  it('should call a postsService.findOne() method with provided id', () => {
    const postId = '1';
    postsController.getOnePost(postId);
    expect(postsService.findOne).toBeCalledWith({ id: postId });
  });

  it('should call a postsService.findManyWithPafination() method with provided page and size', () => {
    const paginationQuery: PaginationQueryDto = {
      page: 1,
      size: 5,
    };

    postsController.getAllPosts(
      paginationQuery,
      new PostOrderQueryDto(),
      new PostWhereQueryDto(),
    );
    expect(postsService.findManyWithPagination).toBeCalledWith(
      paginationQuery,
      new PostWhereQueryDto(),
      new PostOrderQueryDto().orderObject(),
    );
  });

  it('should call a postsService.update() method with provided id and payload object', () => {
    const postId = '1';
    const payload: UpdatePostDto = {
      title: 'Test Title',
    };
    postsController.updatePost(postId, payload);
    expect(postsService.update).toBeCalledWith(postId, payload);
  });

  it('should call a postsSerice.softDelete() method with provided id', () => {
    const postId = '1';
    postsController.deletePost(postId);
    expect(postsService.softDelete).toBeCalledWith(postId);
  });
});
