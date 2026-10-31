import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
import { PostRevisionsService } from './post-revisions.service';
import { PostRevisionEntity } from './entities/post-revision.entity';
import { FileEntity } from '@/modules/files/entities/file.entity';

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
  let revisionsService: jest.Mocked<PostRevisionsService>;
  // Менеджер транзакції: колбек виконується одразу на цьому моку.
  const manager = {
    create: jest.fn((_entity, plain) => plain),
    save: jest.fn(async (_entity, value) => ({ id: '1', ...value })),
    findOne: jest.fn(),
    exists: jest.fn(),
  };
  const POST_REPOSITORY_TOKEN = getRepositoryToken(PostEntity);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: POST_REPOSITORY_TOKEN,
          useValue: createMock<Repository<PostEntity>>(),
        },
        {
          provide: PostRevisionsService,
          useValue: createMock<PostRevisionsService>(),
        },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    postsRepository = module.get<Repository<PostEntity>>(POST_REPOSITORY_TOKEN);
    revisionsService = module.get(PostRevisionsService);
    Object.defineProperty(postsRepository, 'manager', {
      value: { transaction: jest.fn((cb) => cb(manager)) },
    });
  });

  it('should be defined', () => {
    expect(postsService).toBeDefined();
  });

  it('should save the post and record a "create" revision in one transaction', async () => {
    const createPostDto: CreatePostDto = {
      title: 'Test title',
      content: 'Test content',
      author: new UserEntity(),
      status: new PostStatusEntity(),
    };
    await postsService.create(createPostDto, adminUser);
    expect(manager.save).toHaveBeenCalledWith(PostEntity, createPostDto);
    expect(revisionsService.record).toHaveBeenCalledWith(
      manager,
      '1',
      adminUser.id,
      'create',
    );
  });

  it('should call postsRepository.findOne() with author relation and return a published post', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    await expect(postsService.findOne({ id: '1' })).resolves.toBe(existingPost);
    expect(postsRepository.findOne).toHaveBeenCalledWith({
      where: { id: '1' },
      relations: { author: true },
    });
  });

  // Regression: legacy posts have author = NULL — findOne must not crash on them
  it('should return a published post without an author to an anonymous user', async () => {
    const authorlessPost = {
      id: '1',
      status: { name: 'Published' },
      author: null,
    } as unknown as PostEntity;
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(authorlessPost);
    await expect(postsService.findOne({ id: '1' })).resolves.toBe(
      authorlessPost,
    );
  });

  it('should not treat an anonymous user as the owner of an authorless unpublished post', async () => {
    const authorlessDraft = {
      id: '1',
      status: { name: 'Draft' },
      author: null,
    } as unknown as PostEntity;
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(authorlessDraft);
    await expect(postsService.findOne({ id: '1' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should call postsRepository.findAndCount() method with options', async () => {
    const queryDto = new PostQueryDto();
    const {
      title,
      author,
      topic,
      category,
      include,
      page,
      size,
      orderBy,
      sort,
    } = queryDto;
    jest.spyOn(postsRepository, 'findAndCount').mockResolvedValue([[], 0]);
    // no user → anonymous → status is forced to Published regardless of query
    await postsService.findManyWithPagination(queryDto);
    expect(postsRepository.findAndCount).toHaveBeenCalledWith({
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

  it('should authorize, snapshot a baseline, save and record an "update" revision', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    const payload = { id: '1', title: 'Test title' } as UpdatePostDto;
    await postsService.update(payload, adminUser);

    expect(revisionsService.ensureBaseline).toHaveBeenCalledWith(manager, '1');
    expect(manager.save).toHaveBeenCalledWith(PostEntity, payload);
    expect(revisionsService.record).toHaveBeenCalledWith(
      manager,
      '1',
      adminUser.id,
      'update',
    );
    // Базовий знімок — до збереження, нова ревізія — після.
    const [baselineOrder] = (revisionsService.ensureBaseline as jest.Mock).mock
      .invocationCallOrder;
    const [saveOrder] = manager.save.mock.invocationCallOrder;
    const [recordOrder] = (revisionsService.record as jest.Mock).mock
      .invocationCallOrder;
    expect(baselineOrder).toBeLessThan(saveOrder);
    expect(saveOrder).toBeLessThan(recordOrder);
  });

  it('should not touch revisions when a non-owner tries to update', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    const stranger = {
      id: 'stranger',
      role: { id: '4' },
    } as unknown as JwtPayloadType;
    await expect(
      postsService.update({ id: '1' } as UpdatePostDto, stranger),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(revisionsService.record).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  describe('revisions', () => {
    const revision = {
      id: 'rev-1',
      postId: '1',
      title: 'Old title',
      slug: 'old-title',
      content: '{"root":{}}',
      metadata: { metaTitle: 'Old meta', indexable: true },
      featuredImageFileId: 'file-1',
      featuredImageUrl: null,
      status: 'Draft',
    } as PostRevisionEntity;

    it('should check access before listing revisions', async () => {
      jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
      const stranger = {
        id: 'stranger',
        role: { id: '4' },
      } as unknown as JwtPayloadType;
      await expect(
        postsService.findRevisions('1', stranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(revisionsService.list).not.toHaveBeenCalled();
    });

    it('should 404 when the revision belongs to another post', async () => {
      jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
      revisionsService.findOne.mockResolvedValue(null);
      await expect(
        postsService.findRevision('1', 'rev-x', adminUser),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(revisionsService.findOne).toHaveBeenCalledWith('1', 'rev-x');
    });

    it('should restore content/meta/image in place, keep status, and record a "restore" revision', async () => {
      jest
        .spyOn(postsRepository, 'findOne')
        .mockResolvedValueOnce(existingPost) // assertCanMutate
        .mockResolvedValueOnce(null) // перевірка унікальності title/slug
        .mockResolvedValueOnce(existingPost); // відповідь
      revisionsService.findOne.mockResolvedValue(revision);
      manager.findOne.mockResolvedValue({
        id: '1',
        metadata: { id: 'meta-1', metaTitle: 'New meta', ogTitle: 'Og' },
      });
      manager.exists.mockResolvedValue(true);

      await postsService.restoreRevision('1', 'rev-1', adminUser);

      expect(manager.exists).toHaveBeenCalledWith(FileEntity, {
        where: { id: 'file-1' },
      });
      const saved = manager.save.mock.calls[0][1];
      expect(saved).toEqual({
        id: '1',
        title: 'Old title',
        slug: 'old-title',
        content: '{"root":{}}',
        featuredImageFile: { id: 'file-1' },
        featuredImageUrl: null,
        metadata: {
          id: 'meta-1',
          metaTitle: 'Old meta',
          ogTitle: 'Og',
          indexable: true,
        },
      });
      expect(saved).not.toHaveProperty('status');
      expect(revisionsService.record).toHaveBeenCalledWith(
        manager,
        '1',
        adminUser.id,
        'restore',
        'rev-1',
      );
    });

    it('should drop a featured image that no longer exists', async () => {
      jest
        .spyOn(postsRepository, 'findOne')
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingPost);
      revisionsService.findOne.mockResolvedValue(revision);
      manager.findOne.mockResolvedValue({ id: '1', metadata: null });
      manager.exists.mockResolvedValue(false);

      await postsService.restoreRevision('1', 'rev-1', adminUser);

      expect(manager.save.mock.calls[0][1].featuredImageFile).toBeNull();
    });

    it('should 409 when another post already uses the revision title/slug', async () => {
      jest
        .spyOn(postsRepository, 'findOne')
        .mockResolvedValueOnce(existingPost)
        .mockResolvedValueOnce({
          id: '2',
          title: 'Old title',
          slug: 'old-title',
        } as PostEntity);
      revisionsService.findOne.mockResolvedValue(revision);

      await expect(
        postsService.restoreRevision('1', 'rev-1', adminUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  it('should authorize (owner/admin) then call softDelete with provided id', async () => {
    jest.spyOn(postsRepository, 'findOne').mockResolvedValue(existingPost);
    await postsService.softDelete('1', adminUser);
    expect(postsRepository.softDelete).toHaveBeenCalledWith('1');
  });
});
