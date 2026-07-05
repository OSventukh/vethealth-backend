import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PostEntity } from './entities/post.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { CreatePostDto } from './dto/create-post.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { PostStatusEntity } from '@/statuses/entities/post-status.entity';
import { PostQueryDto } from './dto/post-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtPayloadType } from '@/modules/auth/strategies/types/jwt-payload.type';
import { postOrder } from './utils/post-order';

const adminUser = {
  id: 'author-id',
  role: { id: '2' },
} as unknown as JwtPayloadType;

const existingPost = {
  id: '1',
  status: { name: 'Published' },
  author: { id: 'author-id' },
} as PostEntity;

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
      author: new UserEntity(),
      status: new PostStatusEntity(),
    };
    postsService.create(createPostDto);
    expect(postsRepository.create).toBeCalledWith(createPostDto);
  });

  it('should call postsRepository.findOne() with author relation and return a published post', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    await expect(postsService.findOne({ id: '1' })).resolves.toBe(existingPost);
    expect(postsRepository.findOne).toBeCalledWith({
      where: { id: '1' },
      relations: { author: true },
    });
  });

  it('should call postsRepository.findAndCount() method with options', async () => {
    const queryDto = new PostQueryDto();
    const { title, author, topic, category, include, page, size, orderBy, sort } =
      queryDto;
    jest.spyOn(postsRepository, 'findAndCount').mockResolvedValue([[], 0]);
    // no user → anonymous → status is forced to Published regardless of query
    await postsService.findManyWithPagination(queryDto);
    expect(postsRepository.findAndCount).toBeCalledWith({
      where: {
        title,
        status: {
          name: 'Published',
        },
        author: {
          firstname: author,
        },
        topics: {
          slug: topic,
        },
        categories: {
          slug: category,
        },
      },
      skip: (page - 1) * size,
      take: size,
      order: postOrder(orderBy, sort),
      relations: include,
    });
  });

  it('should authorize (owner/admin) then call save/create on update', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    const payload = { id: '1', title: 'Test title' } as UpdatePostDto;
    await postsService.update(payload, adminUser);
    expect(postsRepository.save).toBeCalledWith(postsRepository.create(payload));
  });

  it('should authorize (owner/admin) then call softDelete with provided id', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    await postsService.softDelete('1', adminUser);
    expect(postsRepository.softDelete).toBeCalledWith('1');
  });
});
