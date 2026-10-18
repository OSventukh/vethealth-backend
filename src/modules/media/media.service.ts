import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { AllConfigType, FileStorageDriver } from '@/config/config.type';
import { AiService } from '@/modules/ai/ai.service';
import { ImageAltResult } from '@/modules/ai/tasks/image-alt.task';
import { FileEntity } from '@/modules/files/entities/file.entity';
import { FileStorageFactory } from '@/modules/files/storage/file-storage.factory';
import { sniffImageType } from '@/modules/files/utils/sniff-image-type';
import { PageEntity } from '@/modules/pages/entities/page.entity';
import { PostEntity } from '@/modules/posts/entities/post.entity';
import { TopicEntity } from '@/modules/topics/entities/topic.entity';
import { PaginationType } from '@/utils/types/pagination.type';
import { DeleteMediaQueryDto } from './dto/delete-media-query.dto';
import { GenerateAltDto } from './dto/generate-alt.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { prepareAiImage } from './utils/prepare-ai-image';
import {
  BackfillResult,
  BulkDeleteResult,
  MEDIA_ERROR_CODES,
  MediaDetails,
  MediaUsage,
  MediaUsageField,
  MediaUsageType,
} from './media.types';

const DEFAULT_PAGE_SIZE = 40;

// Скільки живе обчислений набір використаних файлів для фільтра
// «Невикористані»: інакше кожне «Показати ще» перечитувало б весь контент.
// Для видалення кеш не використовується — там рахуємо заново.
const USED_IDS_TTL_MS = 30_000;

/** Рядок з `getRawMany`: прапорці полів MySQL віддає як 0/1 (або "0"/"1"). */
interface UsageRow {
  id: string;
  title: string;
  slug: string;
  cover?: number | string | null;
  image?: number | string | null;
  content?: number | string | null;
  social?: number | string | null;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private usedIdsCache: { ids: Set<string>; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepository: Repository<FileEntity>,
    @InjectRepository(PostEntity)
    private readonly postsRepository: Repository<PostEntity>,
    @InjectRepository(PageEntity)
    private readonly pagesRepository: Repository<PageEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicsRepository: Repository<TopicEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileStorageFactory: FileStorageFactory,
    private readonly aiService: AiService,
  ) {}

  async findMany(query: MediaQueryDto): Promise<PaginationType<FileEntity>> {
    const page = query.page ?? 1;
    const size = query.size ?? DEFAULT_PAGE_SIZE;
    const qb = this.filesRepository
      .createQueryBuilder('file')
      .orderBy('file.createdAt', 'DESC')
      .addOrderBy('file.id', 'DESC')
      // `offset` точніший за `page` для довантаження: після локальних
      // завантажень/видалень межі сторінок на сервері вже зсунулися.
      .skip(query.offset ?? (page - 1) * size)
      .take(size);

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        '(file.originalName LIKE :search OR file.alt LIKE :search OR file.path LIKE :search)',
        { search: `%${escapeLike(search)}%` },
      );
    }
    if (query.missingAlt) {
      qb.andWhere("(file.alt IS NULL OR file.alt = '')");
    }
    if (query.narrowerThan) {
      qb.andWhere('file.width < :narrowerThan', {
        narrowerThan: query.narrowerThan,
      });
    }
    if (query.unused) {
      const used = [...(await this.cachedUsedIds())];
      if (used.length) qb.andWhere('file.id NOT IN (:...used)', { used });
    }

    const [items, count] = await qb.getManyAndCount();
    return {
      items,
      count,
      currentPage: page,
      totalPages: Math.ceil(count / size),
    };
  }

  async findOne(id: string): Promise<MediaDetails> {
    const file = await this.getFile(id);
    const usages = await this.findUsages(id);
    return Object.assign(file, { usages });
  }

  async update(id: string, dto: UpdateMediaDto): Promise<FileEntity> {
    const file = await this.getFile(id);
    const alt = dto.alt.trim() || null;
    // `update`, а не `save`: save перезаписав би `path` значенням, яке
    // @AfterLoad уже перетворив на публічний URL.
    await this.filesRepository.update(id, { alt });
    file.alt = alt;
    return file;
  }

  /**
   * Видаляє файл із БД і сховища. Якщо він десь використовується і `force`
   * не передано — 409 зі списком матеріалів, щоб редактор вирішив свідомо.
   * Із `force` обкладинки постів і картинки тем, що на нього посилаються,
   * обнуляються (інакше не дасть FK); посилання в тексті лишаються битими —
   * про це й попереджали.
   */
  async remove(id: string, { force }: DeleteMediaQueryDto): Promise<void> {
    const rawPath = await this.getRawPath(id);
    const usages = await this.findUsages(id);
    if (usages.length && !force) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Media is used in other materials',
        errorCode: MEDIA_ERROR_CODES.IN_USE,
        usages,
      });
    }
    await this.deleteFile(id, rawPath);
  }

  /**
   * Масове видалення (з фільтра «Невикористані»). Використання рахуються
   * одним проходом на всю партію, а не трьома LIKE-сканами на кожен файл;
   * детальний список — лише для тих, що виявились використаними. Такі без
   * `force` пропускаються і повертаються в `inUse` — рішення за редактором.
   */
  async bulkRemove(ids: string[], force = false): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = { deleted: [], inUse: [] };
    const used = force ? new Set<string>() : await this.findUsedIds();

    for (const id of new Set(ids)) {
      // Послідовно: кожне видалення — транзакція + запит до сховища.
      const rawPath = await this.getRawPath(id).catch((error: unknown) => {
        // Уже видалено (паралельно чи повторним кліком): мета досягнута.
        if (error instanceof NotFoundException) return null;
        throw error;
      });
      if (rawPath === null) continue;

      if (used.has(id)) {
        const usages = await this.findUsages(id);
        if (usages.length) {
          result.inUse.push({ id, usages });
          continue;
        }
      }
      await this.deleteFile(id, rawPath);
      result.deleted.push(id);
    }
    return result;
  }

  /**
   * Із БД (FK обкладинок і тем обнуляються — інакше не дасть зовнішній ключ;
   * посилання в тексті лишаються битими, про це попереджає UI), потім зі
   * сховища.
   */
  private async deleteFile(id: string, rawPath: string): Promise<void> {
    this.usedIdsCache = null;
    await this.dataSource.transaction(async (manager) => {
      // Сирий SQL: QueryBuilder.update зачепив би updatedAt матеріалів
      // (а з ним lastmod у sitemap), хоча їхній контент не змінився.
      // М'яко видалені пости теж тримають FK, тож обнуляємо без фільтра.
      await manager.query(
        'UPDATE posts SET featuredImageFileId = NULL WHERE featuredImageFileId = ?',
        [id],
      );
      await manager.query(
        'UPDATE topics SET imageId = NULL WHERE imageId = ?',
        [id],
      );
      await manager.delete(FileEntity, id);
    });

    // Після коміту: обʼєкт, що лишився в сховищі через збій, — лише сміття,
    // а от запис у БД без файлу показував би биту картинку.
    const key = this.storageKeyOf(rawPath);
    if (!key) return;
    // Картинки тем зберігаються під slug-іменем без суфікса, тож два записи
    // можуть ділити один обʼєкт — тоді він ще потрібен іншому.
    if (await this.filesRepository.exists({ where: { path: rawPath } })) {
      return;
    }
    try {
      await this.fileStorageFactory.getStorage().delete(key);
    } catch (error) {
      this.logger.error(
        `Media ${id} removed from DB, but storage delete of "${key}" failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Дозаповнює size/mimeType/width/height файлам, завантаженим до медіатеки
   * (читає байти зі сховища). Ідемпотентно: бере лише рядки без `size` — він
   * пишеться завжди, тож файл, розміри якого визначити неможливо (SVG без
   * атрибутів), не перечитується з R2 на кожному запуску.
   */
  async backfillMetadata(): Promise<BackfillResult> {
    const rows = await this.filesRepository
      .createQueryBuilder('file')
      .select('file.id', 'id')
      .addSelect('file.path', 'path')
      .where('file.size IS NULL')
      .getRawMany<{ id: string; path: string }>();

    const result: BackfillResult = { updated: 0, failed: [] };
    for (const { id, path } of rows) {
      const key = this.storageKeyOf(path);
      if (!key) {
        result.failed.push({ id, path, reason: 'not in current storage' });
        continue;
      }
      try {
        const bytes = await this.fileStorageFactory.getStorage().read(key);
        const { mimeType, width, height } = await describeImage(bytes);
        await this.filesRepository.update(id, {
          size: bytes.length,
          width,
          height,
          // Не розпізнали тип — не затираємо той, що вже записано.
          ...(mimeType ? { mimeType } : {}),
        });
        result.updated++;
      } catch (error) {
        result.failed.push({
          id,
          path,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return result;
  }

  /**
   * Генерує alt за самим зображенням (vision-модель) + назвами матеріалів,
   * де воно стоїть. Нічого не зберігає — редактор переглядає результат.
   */
  async generateAlt(id: string, dto: GenerateAltDto): Promise<ImageAltResult> {
    const rawPath = await this.getRawPath(id);
    const key = this.storageKeyOf(rawPath);
    if (!key) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Media file is not stored in the configured storage',
        errorCode: MEDIA_ERROR_CODES.NOT_READABLE,
      });
    }

    let bytes: Buffer;
    try {
      bytes = await this.fileStorageFactory.getStorage().read(key);
    } catch (error) {
      this.logger.error(
        `Cannot read media ${id} ("${key}") for alt generation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Media file cannot be read from storage',
        errorCode: MEDIA_ERROR_CODES.NOT_READABLE,
      });
    }

    let image: Awaited<ReturnType<typeof prepareAiImage>>;
    try {
      image = await prepareAiImage(bytes);
    } catch (error) {
      this.logger.warn(
        `Media ${id} cannot be decoded for alt generation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException('Media file is not a decodable image', {
        errorCode: MEDIA_ERROR_CODES.UNSUPPORTED_FOR_AI,
      });
    }

    const usages = await this.findUsages(id);
    return this.aiService.generateImageAlt({
      image: image.data,
      mediaType: image.mediaType,
      context: usages.map((usage) => usage.title),
      current: dto.current?.trim(),
      hint: dto.hint?.trim(),
    });
  }

  /**
   * Матеріали, що посилаються на файл: через FK (обкладинка поста, картинка
   * теми) або URL-ом у тексті/блоках/метаданих. Текстові посилання шукаємо
   * за ключем сховища — він є підрядком будь-якого публічного URL файлу,
   * незалежно від домену (бекенд, CDN, R2).
   */
  async findUsages(id: string): Promise<MediaUsage[]> {
    const needle = usageNeedleOf(await this.getRawPath(id));
    const params = { id, like: `%${escapeLike(needle)}%` };
    const social =
      '(metadata.ogImage LIKE :like OR metadata.twitterImage LIKE :like)';

    const [posts, pages, topics] = await Promise.all([
      usageQuery(this.postsRepository.createQueryBuilder('entity'), {
        cover:
          '(entity.featuredImageFileId = :id OR entity.featuredImageUrl LIKE :like)',
        content: 'entity.content LIKE :like',
        social,
      })
        .setParameters(params)
        .getRawMany<UsageRow>(),
      usageQuery(this.pagesRepository.createQueryBuilder('entity'), {
        content: 'entity.content LIKE :like',
        social,
      })
        .setParameters(params)
        .getRawMany<UsageRow>(),
      usageQuery(this.topicsRepository.createQueryBuilder('entity'), {
        image: 'entity.imageId = :id',
        social,
      })
        .setParameters(params)
        .getRawMany<UsageRow>(),
    ]);

    return [
      ...toUsages('post', posts),
      ...toUsages('page', pages),
      ...toUsages('topic', topics),
    ];
  }

  /**
   * Id усіх файлів, що десь використовуються — для фільтра «Невикористані».
   * Ті самі джерела, що й у {@link findUsages}, але одним проходом: текст
   * усіх матеріалів вантажиться раз, а з нього вибираються шляхи до
   * зображень (`images/…`), замість LIKE-запиту на кожен файл.
   */
  async findUsedIds(): Promise<Set<string>> {
    const [files, posts, pages, topics] = await Promise.all([
      this.filesRepository
        .createQueryBuilder('file')
        .select('file.id', 'id')
        .addSelect('file.path', 'path')
        .getRawMany<{ id: string; path: string }>(),
      this.postsRepository
        .createQueryBuilder('entity')
        .leftJoin('entity.metadata', 'metadata')
        .select('entity.featuredImageFileId', 'fileId')
        .addSelect('entity.featuredImageUrl', 'url')
        .addSelect('entity.content', 'content')
        .addSelect('metadata.ogImage', 'ogImage')
        .addSelect('metadata.twitterImage', 'twitterImage')
        .getRawMany<Record<string, string | null>>(),
      this.pagesRepository
        .createQueryBuilder('entity')
        .leftJoin('entity.metadata', 'metadata')
        .select('entity.content', 'content')
        .addSelect('metadata.ogImage', 'ogImage')
        .addSelect('metadata.twitterImage', 'twitterImage')
        .getRawMany<Record<string, string | null>>(),
      this.topicsRepository
        .createQueryBuilder('entity')
        .leftJoin('entity.metadata', 'metadata')
        .select('entity.imageId', 'fileId')
        .addSelect('metadata.ogImage', 'ogImage')
        .addSelect('metadata.twitterImage', 'twitterImage')
        .getRawMany<Record<string, string | null>>(),
    ]);

    const rows = [...posts, ...pages, ...topics];
    const linkedIds = new Set(rows.map((row) => row.fileId).filter(Boolean));
    const texts = rows.flatMap(({ url, content, ogImage, twitterImage }) =>
      [url, content, ogImage, twitterImage].filter(Boolean),
    );
    const referenced = collectImageKeys(texts);
    // Запасний шлях — той самий підрядок, що шукає LIKE у findUsages
    // (регістронезалежно, як колація MySQL). Потрібен для ключів, які регексп
    // не впізнає цілком (легасі-імена тем із дужками, апострофами тощо) і
    // для зовнішніх URL. Більшість використаних файлів відсікає Set вище.
    let corpus: string | undefined;

    const used = new Set<string>();
    for (const { id, path } of files) {
      const needle = usageNeedleOf(path);
      if (linkedIds.has(id) || referenced.has(needle)) {
        used.add(id);
        continue;
      }
      corpus ??= texts.join('\n').toLowerCase();
      if (corpus.includes(needle.toLowerCase())) used.add(id);
    }
    return used;
  }

  private async cachedUsedIds(): Promise<Set<string>> {
    if (!this.usedIdsCache || this.usedIdsCache.expiresAt < Date.now()) {
      this.usedIdsCache = {
        ids: await this.findUsedIds(),
        expiresAt: Date.now() + USED_IDS_TTL_MS,
      };
    }
    return this.usedIdsCache.ids;
  }

  private async getFile(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findOne({ where: { id } });
    if (!file) throw new NotFoundException('Media not found');
    return file;
  }

  /** `path` як він лежить у БД — @AfterLoad сутності вже переписав би його в URL. */
  private async getRawPath(id: string): Promise<string> {
    const row = await this.filesRepository
      .createQueryBuilder('file')
      .select('file.path', 'path')
      .where('file.id = :id', { id })
      .getRawOne<{ path: string }>();
    if (!row) throw new NotFoundException('Media not found');
    return row.path;
  }

  /**
   * Ключ у поточному сховищі або `null`, якщо файл живе деінде: зовнішній
   * URL, або локальний `/uploads/…`-запис, коли сервер уже на R2 (і навпаки).
   */
  private storageKeyOf(rawPath: string): string | null {
    if (/^https?:\/\//.test(rawPath)) return null;
    const isLocalPath = rawPath.startsWith('/');
    const driver = this.configService.getOrThrow('file.storageDriver', {
      infer: true,
    });
    if ((driver === FileStorageDriver.Local) !== isLocalPath) return null;
    return isLocalPath ? rawPath : rawPath.replace(/^\/+/, '');
  }
}

// Ключ зображення в URL: `images/…` (R2) з опційним `uploads/` (локально).
const IMAGE_KEY_PATTERN = /(?:uploads\/)?images\/[\w.\-/%]+/g;

/**
 * Ключі сховища, на які посилаються тексти. Кожен ключ — в обох формах (з
 * `uploads/` і без), бо після міграції на R2 у тексті міг лишитися старий
 * локальний URL — LIKE у {@link MediaService.findUsages} теж його знаходить.
 */
export function collectImageKeys(texts: string[]): Set<string> {
  const keys = new Set<string>();
  for (const text of texts) {
    for (const [match] of text.matchAll(IMAGE_KEY_PATTERN)) {
      keys.add(match);
      keys.add(match.replace(/^uploads\//, ''));
    }
  }
  return keys;
}

/** Тип і розміри зображення з байтів (для дозаповнення старих файлів). */
async function describeImage(bytes: Buffer): Promise<{
  mimeType: string | null;
  width: number | null;
  height: number | null;
}> {
  const sniffed = sniffImageType(bytes);
  const metadata = await sharp(bytes)
    .metadata()
    .catch(() => null);
  const rotated = (metadata?.orientation ?? 1) >= 5;
  return {
    mimeType: sniffed?.mimeType ?? null,
    width: (rotated ? metadata?.height : metadata?.width) ?? null,
    height: (rotated ? metadata?.width : metadata?.height) ?? null,
  };
}

/** `id, title, slug` + прапорець на кожне поле; рядок потрапляє, якщо збігся хоч один. */
function usageQuery<T extends { id: string }>(
  qb: SelectQueryBuilder<T>,
  fields: Partial<Record<MediaUsageField, string>>,
): SelectQueryBuilder<T> {
  qb.leftJoin('entity.metadata', 'metadata')
    .select('entity.id', 'id')
    .addSelect('entity.title', 'title')
    .addSelect('entity.slug', 'slug');
  for (const [field, condition] of Object.entries(fields)) {
    qb.addSelect(`CASE WHEN ${condition} THEN 1 ELSE 0 END`, field);
  }
  return qb.where(`(${Object.values(fields).join(' OR ')})`);
}

function toUsages(type: MediaUsageType, rows: UsageRow[]): MediaUsage[] {
  const fields: MediaUsageField[] = ['cover', 'image', 'content', 'social'];
  return rows.map((row) => ({
    type,
    id: row.id,
    title: row.title,
    slug: row.slug,
    fields: fields.filter((field) => Number(row[field]) === 1),
  }));
}

/**
 * Підрядок, за яким файл знаходиться в тексті: ключ без провідного `/`
 * (`uploads/images/…` локально, `images/…` у R2), а для зовнішнього URL —
 * сам URL.
 */
export function usageNeedleOf(rawPath: string): string {
  return /^https?:\/\//.test(rawPath) ? rawPath : rawPath.replace(/^\/+/, '');
}

/** Екранує `%`, `_` і `\` для LIKE (MySQL: escape-символ за замовчуванням — `\`). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
