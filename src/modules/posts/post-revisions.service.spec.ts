import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-jest';
import { EntityManager, Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { PostRevisionEntity } from './entities/post-revision.entity';
import {
  POST_REVISIONS_LIMIT,
  PostRevisionsService,
  toPostSnapshot,
} from './post-revisions.service';

const post = {
  id: 'post-1',
  title: 'Title',
  slug: 'title',
  content: '{"root":{}}',
  featuredImageFile: { id: 'file-1' },
  featuredImageUrl: null,
  status: { name: 'Published' },
  updatedAt: new Date('2026-01-02T03:04:05Z'),
  metadata: {
    id: 'meta-1',
    metaTitle: 'Meta',
    indexable: true,
    structuredData: { '@type': 'Article', author: { name: 'A' } },
    createdAt: new Date(),
  },
} as unknown as PostEntity;

describe('PostRevisionsService', () => {
  let service: PostRevisionsService;
  let manager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostRevisionsService,
        {
          provide: getRepositoryToken(PostRevisionEntity),
          useValue: createMock<Repository<PostRevisionEntity>>(),
        },
      ],
    }).compile();
    service = module.get(PostRevisionsService);

    manager = createMock<EntityManager>();
    manager.create.mockImplementation((_entity, plain) => plain as any);
    manager.save.mockImplementation(
      async (_entity, value) =>
        ({ id: 'rev-new', ...(value as object) }) as any,
    );
    manager.find.mockResolvedValue([]);
  });

  const mockFindOne = (latest: Partial<PostRevisionEntity> | null) => {
    manager.findOne.mockImplementation(async (entity) =>
      entity === PostEntity ? post : latest,
    );
  };

  it('snapshot keeps only SEO fields of metadata (no id/dates)', () => {
    const snapshot = toPostSnapshot(post);
    expect(snapshot.featuredImageFileId).toBe('file-1');
    expect(snapshot.status).toBe('Published');
    expect(snapshot.metadata).not.toHaveProperty('id');
    expect(snapshot.metadata).not.toHaveProperty('createdAt');
    expect(snapshot.metadata?.metaTitle).toBe('Meta');
    expect(snapshot.metadata?.ogTitle).toBeNull();
  });

  it('records a revision when the state differs from the latest one', async () => {
    mockFindOne({ ...toPostSnapshot(post), content: 'older' });
    const result = await service.record(manager, 'post-1', 'user-1', 'update');
    expect(result).not.toBeNull();
    expect(manager.save).toHaveBeenCalledWith(
      PostRevisionEntity,
      expect.objectContaining({
        postId: 'post-1',
        editorId: 'user-1',
        reason: 'update',
        content: '{"root":{}}',
      }),
    );
  });

  it('skips the revision when nothing changed — even if MySQL reordered JSON keys', async () => {
    const snapshot = toPostSnapshot(post);
    const reordered = {
      ...snapshot,
      metadata: Object.fromEntries(
        Object.entries(snapshot.metadata ?? {}).toReversed(),
      ),
    };
    reordered.metadata.structuredData = {
      author: { name: 'A' },
      '@type': 'Article',
    };
    mockFindOne(reordered);
    const result = await service.record(manager, 'post-1', 'user-1', 'update');
    expect(result).toBeNull();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('treats a status change as a new revision', async () => {
    mockFindOne({ ...toPostSnapshot(post), status: 'Draft' });
    await expect(
      service.record(manager, 'post-1', 'user-1', 'update'),
    ).resolves.not.toBeNull();
  });

  it('does not delete anything while under the limit', async () => {
    mockFindOne(null);
    manager.find.mockResolvedValue([{ id: 'rev-1' }] as any);
    await service.record(manager, 'post-1', 'user-1', 'update');
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it(`prunes revisions beyond the newest ${POST_REVISIONS_LIMIT}`, async () => {
    mockFindOne(null);
    const ids = Array.from({ length: POST_REVISIONS_LIMIT }, (_, i) => ({
      id: `rev-${i}`,
    }));
    manager.find.mockResolvedValue([
      ...ids,
      { id: 'old-1' },
      { id: 'old-2' },
    ] as any);
    await service.record(manager, 'post-1', 'user-1', 'update');
    const [, options] = manager.find.mock.calls[0];
    expect(options).toMatchObject({
      where: { postId: 'post-1' },
      order: { createdAt: 'DESC' },
    });
    // Регресія: skip без take у MySQL кидає OffsetWithoutLimitNotSupportedError.
    expect(options).not.toHaveProperty('skip');
    expect(manager.delete).toHaveBeenCalledWith(PostRevisionEntity, [
      'old-1',
      'old-2',
    ]);
  });

  it('writes a baseline (dated by post.updatedAt, no editor) only for posts without history', async () => {
    mockFindOne(null);
    manager.count.mockResolvedValue(0);
    await service.ensureBaseline(manager, 'post-1');
    expect(manager.insert).toHaveBeenCalledWith(
      PostRevisionEntity,
      expect.objectContaining({
        postId: 'post-1',
        reason: 'baseline',
        editorId: null,
        createdAt: post.updatedAt,
      }),
    );

    manager.insert.mockClear();
    manager.count.mockResolvedValue(3);
    await service.ensureBaseline(manager, 'post-1');
    expect(manager.insert).not.toHaveBeenCalled();
  });
});
