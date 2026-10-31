import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { AiService } from '@/modules/ai/ai.service';
import { FileEntity } from '@/modules/files/entities/file.entity';
import { FileStorage } from '@/modules/files/storage/file-storage.interface';
import { FileStorageFactory } from '@/modules/files/storage/file-storage.factory';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import sharp from 'sharp';
import { MediaUsage } from './media.types';
import {
  collectImageKeys,
  escapeLike,
  MediaService,
  usageNeedleOf,
} from './media.service';

// `ai` і `@ai-sdk/*` — ESM-only: приїжджають транзитивно через AiService
// (тут застабаний), тож досить порожніх фабрик.
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: jest.fn() }));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  createProviderRegistry: jest.fn(),
  APICallError: { isInstance: () => false },
  NoObjectGeneratedError: { isInstance: () => false },
  RetryError: { isInstance: () => false },
}));

const FILE_ID = '11111111-1111-4111-8111-111111111111';
let AVIF: Buffer;
beforeAll(async () => {
  AVIF = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#cc3300' },
  })
    .avif()
    .toBuffer();
});

/** Ланцюжковий QueryBuilder: усі методи повертають себе, результати задаються. */
function fakeQueryBuilder(result: { rawOne?: unknown; rawMany?: unknown[] }) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'select',
    'addSelect',
    'leftJoin',
    'where',
    'andWhere',
    'setParameters',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getRawOne = jest.fn().mockResolvedValue(result.rawOne);
  qb.getRawMany = jest.fn().mockResolvedValue(result.rawMany ?? []);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

const repository = <T>(qb: ReturnType<typeof fakeQueryBuilder>) =>
  ({
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(),
    update: jest.fn(),
    exists: jest.fn().mockResolvedValue(false),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('MediaService', () => {
  let files: jest.Mocked<Repository<FileEntity>>;
  let posts: ReturnType<typeof fakeQueryBuilder>;
  let pages: ReturnType<typeof fakeQueryBuilder>;
  let topics: ReturnType<typeof fakeQueryBuilder>;
  let storage: jest.Mocked<FileStorage>;
  let manager: { query: jest.Mock; delete: jest.Mock };
  let generateImageAlt: jest.Mock;
  let driver: FileStorageDriver;

  let filesQb: ReturnType<typeof fakeQueryBuilder>;
  const build = (rawPath: string | undefined) => {
    filesQb = fakeQueryBuilder({
      rawOne: rawPath ? { path: rawPath } : undefined,
    });
    files = repository<FileEntity>(filesQb);
    return new MediaService(
      files,
      repository<PostEntity>(posts),
      repository<PageEntity>(pages),
      repository<TopicEntity>(topics),
      {
        transaction: (work: (m: typeof manager) => Promise<void>) =>
          work(manager),
      } as unknown as DataSource,
      {
        getOrThrow: () => driver,
      } as unknown as ConfigService<AllConfigType>,
      { getStorage: () => storage } as unknown as FileStorageFactory,
      { generateImageAlt } as unknown as AiService,
    );
  };

  beforeEach(() => {
    posts = fakeQueryBuilder({});
    pages = fakeQueryBuilder({});
    topics = fakeQueryBuilder({});
    storage = {
      read: jest.fn().mockResolvedValue(AVIF),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<FileStorage>;
    manager = { query: jest.fn(), delete: jest.fn() };
    generateImageAlt = jest.fn().mockResolvedValue({ alt: 'Рудий кіт' });
    driver = FileStorageDriver.R2;
  });

  describe('findUsages', () => {
    it('searches every table by the storage key and reports matched fields', async () => {
      posts.getRawMany.mockResolvedValue([
        {
          id: 'p1',
          title: 'Кліщі',
          slug: 'ticks',
          cover: '1',
          content: '0',
          social: 1,
        },
      ]);
      topics.getRawMany.mockResolvedValue([
        { id: 't1', title: 'Коти', slug: 'cats', image: 1, social: 0 },
      ]);
      const service = build('images/posts/featured/a_b.png');

      const usages = await service.findUsages(FILE_ID);

      expect(usages).toEqual([
        {
          type: 'post',
          id: 'p1',
          title: 'Кліщі',
          slug: 'ticks',
          fields: ['cover', 'social'],
        },
        {
          type: 'topic',
          id: 't1',
          title: 'Коти',
          slug: 'cats',
          fields: ['image'],
        },
      ]);
      expect(posts.setParameters).toHaveBeenCalledWith({
        id: FILE_ID,
        like: '%images/posts/featured/a\\_b.png%',
      });
    });

    it('throws 404 for an unknown file', async () => {
      await expect(build(undefined).findUsages(FILE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('refuses with 409 and the usages while the file is in use', async () => {
      pages.getRawMany.mockResolvedValue([
        { id: 'pg', title: 'Про нас', slug: 'about', content: 1, social: 0 },
      ]);
      const service = build('images/media/x.png');

      const error = await service
        .remove(FILE_ID, {})
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        errorCode: 'MEDIA_IN_USE',
        usages: [{ type: 'page', id: 'pg', fields: ['content'] }],
      });
      expect(manager.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('with force detaches foreign keys, deletes the row, then the object', async () => {
      topics.getRawMany.mockResolvedValue([
        { id: 't1', title: 'Коти', slug: 'cats', image: 1, social: 0 },
      ]);
      const service = build('images/topics/cats.png');

      await service.remove(FILE_ID, { force: true });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('featuredImageFileId = NULL'),
        [FILE_ID],
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('imageId = NULL'),
        [FILE_ID],
      );
      expect(manager.delete).toHaveBeenCalledWith(FileEntity, FILE_ID);
      expect(storage.delete).toHaveBeenCalledWith('images/topics/cats.png');
    });

    it('does not touch storage for a file that lives outside the current driver', async () => {
      // Легасі-запис `/uploads/…`, коли сервер уже на R2.
      await build('/uploads/images/old.png').remove(FILE_ID, {});

      expect(manager.delete).toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('keeps the storage object when another record shares its key', async () => {
      const service = build('images/topics/dog.svg');
      files.exists.mockResolvedValue(true);

      await service.remove(FILE_ID, {});

      expect(manager.delete).toHaveBeenCalled();
      expect(files.exists).toHaveBeenCalledWith({
        where: { path: 'images/topics/dog.svg' },
      });
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('keeps the DB deletion when the storage delete fails', async () => {
      storage.delete.mockRejectedValue(new Error('R2 down'));

      await expect(
        build('images/media/x.png').remove(FILE_ID, {}),
      ).resolves.toBeUndefined();
      expect(manager.delete).toHaveBeenCalled();
    });
  });

  describe('generateAlt', () => {
    it('sends the image converted to JPEG with usage titles as context', async () => {
      posts.getRawMany.mockResolvedValue([
        { id: 'p1', title: 'Кліщі у котів', slug: 'ticks', content: 1 },
      ]);

      const result = await build('images/media/x.png').generateAlt(FILE_ID, {
        current: ' старий ',
        hint: 'коротше',
      });

      expect(result).toEqual({ alt: 'Рудий кіт' });
      expect(storage.read).toHaveBeenCalledWith('images/media/x.png');
      expect(generateImageAlt).toHaveBeenCalledWith({
        image: expect.any(Buffer),
        mediaType: 'image/jpeg',
        context: ['Кліщі у котів'],
        current: 'старий',
        hint: 'коротше',
      });
      const [{ image }] = generateImageAlt.mock.calls[0];
      expect((await sharp(image).metadata()).format).toBe('jpeg');
    });

    it('rejects bytes that cannot be decoded as an image', async () => {
      storage.read.mockResolvedValue(Buffer.from('<html>not an image</html>'));

      await expect(
        build('images/media/x.png').generateAlt(FILE_ID, {}),
      ).rejects.toThrow(BadRequestException);
      expect(generateImageAlt).not.toHaveBeenCalled();
    });

    it('reports 422 when the bytes cannot be read', async () => {
      storage.read.mockRejectedValue(new Error('NoSuchKey'));

      await expect(
        build('images/media/x.png').generateAlt(FILE_ID, {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('reads local files by their /uploads path on the local driver', async () => {
      driver = FileStorageDriver.Local;

      await build('/uploads/images/media/x.png').generateAlt(FILE_ID, {});

      expect(storage.read).toHaveBeenCalledWith('/uploads/images/media/x.png');
    });
  });

  describe('findUsedIds', () => {
    it('finds files linked by FK or mentioned in any text, in one pass', async () => {
      const service = build(undefined);
      filesQb.getRawMany.mockResolvedValue([
        { id: 'cover', path: 'images/posts/featured/a.webp' },
        { id: 'inline', path: 'images/posts/content/b.avif' },
        { id: 'legacy', path: '/uploads/images/topics/c.png' },
        { id: 'og', path: 'images/media/d.jpg' },
        { id: 'orphan', path: 'images/media/e.jpg' },
      ]);
      posts.getRawMany.mockResolvedValue([
        {
          fileId: 'cover',
          content:
            '{"src":"https://cdn.example.com/images/posts/content/b.avif"}',
        },
      ]);
      pages.getRawMany.mockResolvedValue([
        {
          content: '"url":"http://localhost:5000/uploads/images/topics/c.png"',
        },
      ]);
      topics.getRawMany.mockResolvedValue([
        { fileId: null, ogImage: 'https://cdn.example.com/images/media/d.jpg' },
      ]);

      const used = await service.findUsedIds();

      expect([...used].toSorted()).toEqual(['cover', 'inline', 'legacy', 'og']);
    });

    it('falls back to a substring search for keys the pattern cuts short', async () => {
      const service = build(undefined);
      // Легасі-імʼя теми з дужками: регексп зупиняється на «(».
      filesQb.getRawMany.mockResolvedValue([
        { id: 'legacy', path: 'images/topics/Photo-(1).png' },
        { id: 'orphan', path: 'images/topics/other.png' },
      ]);
      posts.getRawMany.mockResolvedValue([
        {
          content:
            '"src":"https://cdn.example.com/images/topics/photo-(1).png"',
        },
      ]);

      expect([...(await service.findUsedIds())]).toEqual(['legacy']);
    });
  });

  describe('findMany', () => {
    it('excludes used files for the "unused" filter and filters by width', async () => {
      const service = build(undefined);
      jest.spyOn(service, 'findUsedIds').mockResolvedValue(new Set(['a', 'b']));

      await service.findMany({ unused: true, narrowerThan: 1200 });

      expect(filesQb.andWhere).toHaveBeenCalledWith(
        'file.id NOT IN (:...used)',
        {
          used: ['a', 'b'],
        },
      );
      expect(filesQb.andWhere).toHaveBeenCalledWith(
        'file.width < :narrowerThan',
        { narrowerThan: 1200 },
      );
    });

    it('reuses the used-ids set while loading more and honours offset', async () => {
      const service = build(undefined);
      jest.spyOn(service, 'findUsedIds').mockResolvedValue(new Set(['a']));

      await service.findMany({ unused: true });
      await service.findMany({ unused: true, offset: 43 });

      expect(service.findUsedIds).toHaveBeenCalledTimes(1);
      expect(filesQb.skip).toHaveBeenLastCalledWith(43);
    });
  });

  describe('bulkRemove', () => {
    it('counts usages once per batch, skips used files and already-deleted ones', async () => {
      const service = build('images/media/x.png');
      jest.spyOn(service, 'findUsedIds').mockResolvedValue(new Set(['b', 'c']));
      const usages: MediaUsage[] = [
        { type: 'post', id: 'p', title: 'T', slug: 's', fields: ['content'] },
      ];
      jest
        .spyOn(service, 'findUsages')
        // b — справді використовується; c — Set помилився, LIKE нічого не знайшов.
        .mockResolvedValueOnce([...usages])
        .mockResolvedValueOnce([]);
      filesQb.getRawOne
        .mockResolvedValueOnce({ path: 'images/media/a.png' })
        .mockResolvedValueOnce({ path: 'images/media/b.png' })
        .mockResolvedValueOnce({ path: 'images/media/c.png' })
        .mockResolvedValueOnce(undefined);

      const result = await service.bulkRemove(['a', 'b', 'c', 'gone', 'a']);

      expect(result).toEqual({
        deleted: ['a', 'c'],
        inUse: [{ id: 'b', usages: [...usages] }],
      });
      expect(service.findUsedIds).toHaveBeenCalledTimes(1);
      expect(service.findUsages).toHaveBeenCalledTimes(2);
      expect(manager.delete).toHaveBeenCalledTimes(2);
    });

    it('with force deletes without looking up usages', async () => {
      const service = build('images/media/x.png');
      jest.spyOn(service, 'findUsedIds');
      jest.spyOn(service, 'findUsages');

      await expect(service.bulkRemove(['a'], true)).resolves.toEqual({
        deleted: ['a'],
        inUse: [],
      });
      expect(service.findUsedIds).not.toHaveBeenCalled();
      expect(service.findUsages).not.toHaveBeenCalled();
    });
  });

  describe('backfillMetadata', () => {
    it('only picks rows without size and never erases a known mime type', async () => {
      const service = build(undefined);
      filesQb.getRawMany.mockResolvedValue([
        { id: 'svg', path: 'images/topics/x.svg' },
      ]);
      storage.read.mockResolvedValue(Buffer.from('not decodable'));

      const result = await service.backfillMetadata();

      expect(filesQb.where).toHaveBeenCalledWith('file.size IS NULL');
      expect(result).toEqual({ updated: 1, failed: [] });
      expect(files.update).toHaveBeenCalledWith('svg', {
        size: 13,
        width: null,
        height: null,
      });
    });
  });

  describe('update', () => {
    it('stores a trimmed alt and clears it on an empty string', async () => {
      const service = build('images/media/x.png');
      files.findOne.mockResolvedValue({ id: FILE_ID } as FileEntity);

      await expect(
        service.update(FILE_ID, { alt: '  Кіт  ' }),
      ).resolves.toEqual({ id: FILE_ID, alt: 'Кіт' });
      await service.update(FILE_ID, { alt: '   ' });

      expect(files.update).toHaveBeenNthCalledWith(1, FILE_ID, { alt: 'Кіт' });
      expect(files.update).toHaveBeenNthCalledWith(2, FILE_ID, { alt: null });
    });
  });
});

describe('usageNeedleOf', () => {
  it('drops the leading slash of local paths and keeps external URLs', () => {
    expect(usageNeedleOf('/uploads/images/a.png')).toBe('uploads/images/a.png');
    expect(usageNeedleOf('images/a.png')).toBe('images/a.png');
    expect(usageNeedleOf('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });
});

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
});

describe('collectImageKeys', () => {
  it('extracts storage keys in both local and R2 forms', () => {
    const keys = collectImageKeys([
      'see https://cdn.example.com/images/a/b-1.webp?v=2 and',
      '"http://x/uploads/images/c.png"',
    ]);

    expect(keys).toEqual(
      new Set(['images/a/b-1.webp', 'uploads/images/c.png', 'images/c.png']),
    );
  });
});
