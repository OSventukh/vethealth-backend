import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isDeepStrictEqual } from 'node:util';
import { EntityManager, Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import {
  POST_REVISION_METADATA_FIELDS,
  PostRevisionEntity,
  PostRevisionMetadata,
  PostRevisionReason,
} from './entities/post-revision.entity';

/** Скільки ревізій тримаємо на пост; старші видаляються при записі нової. */
export const POST_REVISIONS_LIMIT = 50;

type PostSnapshot = Pick<
  PostRevisionEntity,
  | 'title'
  | 'slug'
  | 'content'
  | 'metadata'
  | 'featuredImageFileId'
  | 'featuredImageUrl'
  | 'status'
>;

const SNAPSHOT_FIELDS: (keyof PostSnapshot)[] = [
  'title',
  'slug',
  'content',
  'metadata',
  'featuredImageFileId',
  'featuredImageUrl',
  'status',
];

const toMetadataSnapshot = (
  metadata: PostEntity['metadata'] | null | undefined,
): PostRevisionMetadata | null => {
  if (!metadata) {
    return null;
  }
  return Object.fromEntries(
    POST_REVISION_METADATA_FIELDS.map((field) => [
      field,
      metadata[field] ?? null,
    ]),
  ) as PostRevisionMetadata;
};

export const toPostSnapshot = (post: PostEntity): PostSnapshot => ({
  title: post.title,
  slug: post.slug,
  content: post.content,
  metadata: toMetadataSnapshot(post.metadata),
  featuredImageFileId: post.featuredImageFile?.id ?? null,
  featuredImageUrl: post.featuredImageUrl ?? null,
  status: post.status?.name ?? null,
});

// isDeepStrictEqual ігнорує порядок ключів — MySQL JSON їх пересортовує.
const isSameSnapshot = (a: PostSnapshot, b: PostSnapshot) =>
  SNAPSHOT_FIELDS.every((field) =>
    isDeepStrictEqual(a[field] ?? null, b[field] ?? null),
  );

/**
 * Низькорівневий запис/читання ревізій без перевірок доступу (їх робить
 * `PostsService`). Методи запису приймають `EntityManager` транзакції, щоб
 * ревізія і сам пост комітились атомарно.
 */
@Injectable()
export class PostRevisionsService {
  constructor(
    @InjectRepository(PostRevisionEntity)
    private revisionsRepository: Repository<PostRevisionEntity>,
  ) {}

  /**
   * Пост, створений до появи історії, не має жодної ревізії — перед першою
   * правкою знімаємо його поточний стан, інакше його не буде куди відкотити.
   */
  async ensureBaseline(manager: EntityManager, postId: string): Promise<void> {
    const count = await manager.count(PostRevisionEntity, {
      where: { postId },
    });
    if (count > 0) {
      return;
    }
    const post = await this.loadPost(manager, postId);
    if (!post) {
      return;
    }
    await manager.insert(PostRevisionEntity, {
      ...toPostSnapshot(post),
      postId,
      reason: PostRevisionReason.Baseline,
      editorId: null,
      // Час, коли цей стан було збережено востаннє, а не час міграції.
      createdAt: post.updatedAt ?? new Date(),
    });
  }

  /**
   * Знімає поточний (уже збережений у транзакції) стан поста. Якщо він не
   * відрізняється від останньої ревізії — нічого не пише і повертає `null`.
   */
  async record(
    manager: EntityManager,
    postId: string,
    editorId: string | null,
    reason: PostRevisionReason,
    restoredFromId: string | null = null,
  ): Promise<PostRevisionEntity | null> {
    const post = await this.loadPost(manager, postId);
    if (!post) {
      return null;
    }
    const snapshot = toPostSnapshot(post);
    const last = await manager.findOne(PostRevisionEntity, {
      where: { postId },
      order: { createdAt: 'DESC' },
    });
    if (last && isSameSnapshot(last, snapshot)) {
      return null;
    }

    const revision = await manager.save(
      PostRevisionEntity,
      manager.create(PostRevisionEntity, {
        ...snapshot,
        postId,
        reason,
        editorId,
        restoredFromId,
      }),
    );
    await this.prune(manager, postId);
    return revision;
  }

  /** Список без `content` (він великий) — для таблиці історії. */
  list(postId: string): Promise<PostRevisionEntity[]> {
    return this.revisionsRepository.find({
      where: { postId },
      order: { createdAt: 'DESC' },
      relations: { editor: true },
      select: {
        id: true,
        postId: true,
        title: true,
        slug: true,
        status: true,
        reason: true,
        restoredFromId: true,
        editorId: true,
        createdAt: true,
        editor: { id: true, firstname: true, lastname: true },
      },
    });
  }

  findOne(
    postId: string,
    revisionId: string,
  ): Promise<PostRevisionEntity | null> {
    return this.revisionsRepository.findOne({
      where: { id: revisionId, postId },
      relations: { editor: true },
    });
  }

  private loadPost(manager: EntityManager, postId: string) {
    // featuredImageFile і status — eager.
    return manager.findOne(PostEntity, {
      where: { id: postId },
      relations: { metadata: true },
    });
  }

  private async prune(manager: EntityManager, postId: string): Promise<void> {
    // Без `skip`: MySQL-драйвер TypeORM не вміє OFFSET без LIMIT
    // (OffsetWithoutLimitNotSupportedError). Рядків на пост ≤ ліміт+1 — беремо всі id.
    const ids = await manager.find(PostRevisionEntity, {
      where: { postId },
      order: { createdAt: 'DESC' },
      select: { id: true },
    });
    const stale = ids.slice(POST_REVISIONS_LIMIT);
    if (stale.length > 0) {
      await manager.delete(
        PostRevisionEntity,
        stale.map(({ id }) => id),
      );
    }
  }
}
